/**
注册中心最核心的类，包含注册，心跳，续约，全量/增量拉取，状态改变，下线，内部API

* @author Tim
* @since 2020/6/16

**/

//--------------------------------------------------------------------------//

const Config = require('./config.js')
var config = new Config()

const appName = config.appName
const port = config.port
const myZone = config.myZone

//-------------------------------------------------------------------------------//
const request = require('request')
var retryableHttpClient = require('./retryableHttpClient')
var discoverRestHttpClient = require('./discoverRestHttpClient')
var Applications = require('./applications.js')
const PREFIX = 'DiscoveryClient_'
var instanceInfoFactory = require('./instanceInfoFactory')
var instanceInfo = instanceInfoFactory.getInstanceInfo(appName, port, myZone)
var localRegionApps = null



//main 函数
function start() {
	instanceInfoReplicatorStart()
	fetchRegistry(true)

	instanceInfoReplicatorRun()
	heartBeatRun()
	cacheRefreshRun()
}

//注册逻辑
async function register(instanceInfo) {
	appPathIdentifier = instanceInfo.getAppName() + '/' + instanceInfo.getId()
	console.log(PREFIX + ' ' + appPathIdentifier + ' : registering service...')
	try {
		httpResponse = await execute(retryableHttpClient, 'Register', instanceInfo, async (serviceUrl, instanceInfo) => {
			return await discoverRestHttpClient.register(serviceUrl, instanceInfo)
		})
		console.log(PREFIX + ' ' + appPathIdentifier + " - registration status: ",  httpResponse.statusCode);
		return httpResponse.statusCode == 204 ? true : false
	}
	catch(error) {
		console.error(PREFIX + ' ' + appPathIdentifier + ' - registration failed ' + error.message)
		console.error(error)
		return false
	}
}



//启动注册
async function instanceInfoReplicatorStart() {
	instanceInfo.setIsDirty()
	dirtyTimestamp = instanceInfo.isDirtyWithTime()
	if(dirtyTimestamp != null) {
		registerOk = await register(instanceInfo)
		if(registerOk) {
			instanceInfo.unsetIsDirty(dirtyTimestamp)
		}
		else {
			console.error('There was a problem with the instance info replicator')
		}
	}
}



//轮询注册服务，间隔时间为30s
function instanceInfoReplicatorRun() {
	setInterval(async ()=> {
        var dirtyTimestamp = instanceInfo.isDirtyWithTime();
        if (dirtyTimestamp != null) {
            registerOk = await register(instanceInfo)
			if(registerOk) {
				instanceInfo.unsetIsDirty()
			}
			else {
				console.error('There was a problem with the instance info replicator')
			}
        }
    }, 30 * 1000)
}


function heartBeatRun() {
	setInterval(()=> {
        renew(instanceInfo)
    }, 30 * 1000)
}


function cacheRefreshRun() {
	setInterval(()=> {
        fetchRegistry(false)
    }, 30 * 1000)
}


//心跳逻辑
async function renew(instanceInfo) {
	appPathIdentifier = instanceInfo.getAppName() + '/' + instanceInfo.getId()
	try {
		httpResponse = await execute(retryableHttpClient, 'SendHeartBeat', instanceInfo, async (serviceUrl, instanceInfo) => {
			return await discoverRestHttpClient.sendHeardBeat(serviceUrl, instanceInfo)
		})
		console.log(PREFIX + appPathIdentifier + ' - Heartbeat status: '  + httpResponse.statusCode)

		if(httpResponse.statusCode == 404) {
			console.log(PREFIX + appPathIdentifier + ' - Re-registering apps/ '  + instanceInfo.getAppName())
			timestamp = instanceInfo.setIsDirtyWithTime()
			registerOk = await register(instanceInfo)
			if(registerOk) {
				instanceInfo.unsetIsDirty()
			}
			return registerOk
		}
		return httpResponse.statusCode == 200 ? true : false
	}
	catch(error) {
        console.error(PREFIX + appPathIdentifier + ' - was unable to send heartbeat!');
        console.error(error)
		return false
	}
}

//拉取applications外层逻辑
function  fetchRegistry(forceFullRegistryFetch) {

	try {
		if(localRegionApps == null || forceFullRegistryFetch == true) {
			//全量拉取
			getAndStoreFullRegistry()
		}
		else {
			//增量拉取
			getAndUpdateDelta()
		}
	}
	catch(error) {
		appPathIdentifier = instanceInfo.getAppName() + '/' + instanceInfo.getId()
		console.error(PREFIX + appPathIdentifier + ' - was unable to refresh its cache! status = ' + error.message)
		console.error(error)
		return false
	}	
	return true
}


//全量拉取逻辑
async function getAndStoreFullRegistry() {
	console.log('Getting all instance registry info from the eureka server')
	httpResponse = await execute(retryableHttpClient, 'GetApplication', instanceInfo, async (serviceUrl) => {
		return await discoverRestHttpClient.getApplications(serviceUrl)
	})
	if(httpResponse.statusCode == 200) {
		apps = JSON.parse(httpResponse.body)
	}
	if(apps == undefined || apps == null) {
		console.error('The application is null for some reason. Not storing this information')
	}
	else {
		localRegionApps = new Applications(apps)
		localRegionApps.filterAndShuffle()
		// console.log('全量拉取结果: ' + JSON.stringify(localRegionApps))
		console.log('Got full registry with apps hashcode ' + localRegionApps.appHashCode)
	}
}

//增量拉取逻辑
async function getAndUpdateDelta() {

	httpResponse = await execute(retryableHttpClient, 'GetDelta', instanceInfo, async (serviceUrl) => {
		return await discoverRestHttpClient.getDelta(serviceUrl)
	})
	if(httpResponse.statusCode == 200) {
		apps = JSON.parse(httpResponse.body)
	}
	if(apps == undefined || apps == null) {
		console.error('The server does not allow the delta revision to be applied because it is not safe. Hence got the full registry.')
		//假设增量拉取结果失败，转为全量拉取
		getAndStoreFullRegistry()
	}
	else {
		var deltaApps = new Applications(apps)
		// console.log('增量拉取结果: ' + JSON.stringify(deltaApps))
		//这个值是服务端产生的hashcode
		console.log("Got delta update with apps hashcode " + deltaApps.appHashCode)
		//使用增量结果更新本地缓存
		updateDelta(deltaApps)
		//计算更新后的本地hashcode
		reconcileHashCode = localRegionApps.getReconcileHashCode()
		//假设计算后的本地增量与服务端计算结果不一致
		if(reconcileHashCode !== deltaApps.appHashCode) {
			console.log(JSON.stringify(deltaApps))
			reconcileAndLogDifference(reconcileHashCode, deltaApps)
		}
	}
}

//本地与服务端不一致，那么重新来一次全量拉取即可
async function reconcileAndLogDifference(reconcileHashCode, deltaApps) {
	console.log('The Reconcile hashcodes do not match, client : ' + reconcileHashCode + ' , server : ' + deltaApps.appHashCode +  ' Getting the full registry')
	httpResponse = await execute(retryableHttpClient, 'GetApplication', instanceInfo, async (serviceUrl) => {
		return await discoverRestHttpClient.getApplications(serviceUrl)
	})
	apps = JSON.parse(httpResponse.body)
	if(apps == undefined || apps == null) {
		console.error('Cannot fetch full registry from the server; reconciliation failure')
		return
	}
	else {
		localRegionApps = new Applications(apps)
	}
}



//增量拉取得到的结果更新本地applications缓存
function updateDelta(deltaApps) {
	var applications = deltaApps.applications
	for(var i in applications) {
		application = applications[i]
		instances = applications[i].instance
		for(var j in instances) {
			var instance = instances[j]
			if(instance.actionType == 'ADDED') {
				var existingApp = localRegionApps.appNameApplicationMap.get((instance.app).toUpperCase())
				if(existingApp == undefined) {
					localRegionApps.addApplication(application)
				}
				var existingInstance = localRegionApps.instanceMap.get(instance.instanceId)
				if(existingInstance != null && existingInstance != undefined) {
					//由于服务端instance变动了，他的dirtyTime和lastUpdatetime一定会变，当变了再更新
					if(instance.lastDirtyTimestamp.toString() != existingInstance.lastDirtyTimestamp.toString() || 
						instance.lastUpdatedTimestamp.toString() != existingInstance.lastUpdatedTimestamp.toString()
						|| instance.status != existingInstance.status) {
						console.log('Added instance: ' + instance.instanceId + ' to the existing apps')
						localRegionApps.addInstance(instance)
					}

				// 	console.log(instance.instanceId)
				// 	console.log('server -> lastDirtyTimestamp ' + instance.lastDirtyTimestamp)
				// 	console.log('client  -> lastDirtyTimestamp ' + JSON.stringify(localRegionApps.instanceMap.get(instance.instanceId).lastDirtyTimestamp))
				// 	console.log('server -> lastUpdatedTimestamp ' + instance.lastUpdatedTimestamp)
				// 	console.log('client  -> lastUpdatedTimestamp ' + JSON.stringify(localRegionApps.instanceMap.get(instance.instanceId).lastUpdatedTimestamp))
				// }
				}
				else {
					console.log('Added instance: ' + instance.instanceId + ' to the existing apps')
					localRegionApps.addInstance(instance)
				}
				
			}
			if(instance.actionType == 'MODIFIED') {
				var existingApp = localRegionApps.appNameApplicationMap.get((instance.app).toUpperCase())
				if(existingApp == undefined) {
					localRegionApps.addApplication(application)
				}
				var existingInstance = localRegionApps.instanceMap.get(instance.instanceId)
				if(existingInstance != null && existingInstance != undefined) {
					if(instance.lastDirtyTimestamp.toString() != existingInstance.lastDirtyTimestamp.toString() || 
						instance.lastUpdatedTimestamp.toString() != existingInstance.lastUpdatedTimestamp.toString()
						|| instance.status != existingInstance.status) {
						console.log('Modified instance: ' + instance.instanceId + ' to the existing apps')
						localRegionApps.addInstance(instance)
					}
				}
				else {
					console.log('Modified instance: ' + instance.instanceId + ' to the existing apps')
					localRegionApps.addInstance(instance)
				}
				
				
			}
			if(instance.actionType == 'DELETED') {
				var existingApp = localRegionApps.appNameApplicationMap.get((instance.app).toUpperCase())
				if(existingApp !== undefined) {
					var existingInstance = localRegionApps.instanceMap.get(instance.instanceId)
					if(existingInstance != null && existingInstance != undefined) {
						console.log('Deleted instance' + instance.instanceId + ' to the existing apps')
						localRegionApps.removeInstance(instance)
					}		
				}
			}
		}
	}
}

//通用execute
async function execute(retryableHttpClient, reqyestType, instanceInfo, requestExecutor) {
	return await retryableHttpClient.execute(reqyestType, requestExecutor, instanceInfo)
}

function chooseServers(key) {
	return localRegionApps.chooseServers(key)
}

function chooseServer(key) {
	return localRegionApps.chooseServer(key)
}






exports.start = start
exports.chooseServer = chooseServer
exports.chooseServers = chooseServers







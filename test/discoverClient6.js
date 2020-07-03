/**
注册中心最核心的类，包含注册，心跳，续约，全量/增量拉取，状态改变，下线，内部API

**/


const request = require('request')
var retryableHttpClient = require('./retryableHttpClient')
var discoverRestHttpClient = require('./discoverRestHttpClient')
const PREFIX = 'DiscoveryClient_'

// var Applications = require('./applications.js')

var Applications = null
var localRegionApps = null

const appName = 'node-provider2'
const port = 33431
const myZone = 'shanghai-1'

var instanceInfoFactory = require('./instanceInfoFactory')
var instanceInfo = instanceInfoFactory.getInstanceInfo(appName, port, myZone)
var started = false


//main 函数
function start() {
	instanceInfoReplicatorStart()
	instanceInfoReplicatorRun()
	heartBeatRun()
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

//TimedSupervisorTask
function heartBeatRun() {
	setInterval(()=> {
        renew(instanceInfo)
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

// function  fetchRegistry(forceFullRegistryFetch) {

// 	try {
// 		if(localRegionApps == null || forceFullRegistryFetch == true) {
// 			getAndStoreFullRegistry()
// 		}
// 		else {
// 			getAndUpdateDelta()
// 		}
// 	}
// 	catch(error) {
// 		appPathIdentifier = instanceInfo.getAppName() + '/' + instanceInfo.getId()
// 		console.error(PREFIX + appPathIdentifier + ' - was unable to refresh its cache! status = ' + error.message)
// 		console.error(error)
// 		return false
// 	}	
// 	return true
// }


// async function getAndUpdateDelta() {

// 	httpResponse = await execute(retryableHttpClient, 'GetDelta', instanceInfo, async (serviceUrl) => {
// 		return await discoverRestHttpClient.getApplications(serviceUrl)
// 	})
// 	if(httpResponse.statusCode == 200) {
// 		delta = JSON.parse(httpResponse.body)
// 	}
// 	if(delta == undefined || delta == null) {
// 		console.log('The server does not allow the delta revision to be applied because it is not safe. Hence got the full registry.')
// 		getAndStoreFullRegistry()
// 	}
// 	else {
// 		console.log("Got delta update with apps hashcode " + apps.applications.apps__hashcode)
// 		updateDelta(delta)
// 		reconcileHashCode = localRegionApps.getReconcileHashCode()
// 		if(reconcileHashCode !== delta.apps__hashcode) {
// 			reconcileAndLogDifference(delta, reconcileHashCode)
// 		}
// 	}
// }

// async function reconcileAndLogDifference(delta, reconcileHashCode) {
// 	console.log('The Reconcile hashcodes do not match, client : ' + reconcileHashCode + ' , server : ' + delta.applications.apps__hashcode +  ' Getting the full registry')
// 	httpResponse = await execute(retryableHttpClient, 'GetApplication', instanceInfo, async (serviceUrl) => {
// 		return await discoverRestHttpClient.getApplications(serviceUrl)
// 	})
// 	serverapps = JSON.parse(httpResponse.body)
// 	if(serverapps == undefined || serverapps == null) {
// 		console.error('Cannot fetch full registry from the server; reconciliation failure')
// 		return
// 	}
// 	else {
// 		localRegionApps = new Applications(serverapps)
// 		console.log('The Reconcile hashcodes after complete sync up, client : ' + localRegionApps.applications.apps__hashcode + ' server : ' + serverapps.applications.apps__hashcode)
// 	}
// }


// function updateDelta(delta) {
// 	deltas = new Applications(delta)
// 	applications = deltas.applications.application
// 	for(i in applications) {
// 		application = applications[i]
// 		instances = applications[i].instance
// 		for(j in instances) {
// 			instance = instances[j]
// 			if(instance.actionType == 'ADDED') {
// 				existingApp = deltas.appNameApplicationMap.get(instance.app)
// 				if(existingApp == undefined) {
// 					localRegionApps.addApplication()
// 				}
// 				console.log('Added instance' + instance.app + ' to the existing apps')

// 				localRegionApps.addInstance(instance)
// 			}
// 			if(instance.actionType == 'MODIFIED') {
// 				existingApp = deltas.appNameApplicationMap.get(instance.app)
// 				if(existingApp == undefined) {
// 					localRegionApps.addApplication()
// 				}
// 				console.log('Modified instance' + instance.app + ' to the existing apps')

// 				localRegionApps.addInstance(instance)
// 			}
// 			if(instance.actionType == 'DELETED') {
// 				existingApp = deltas.appNameApplicationMap.get(instance.app)
// 				if(existingApp !== undefined) {
// 					console.log('Modified instance' + instance.app + ' to the existing apps')
// 					localRegionApps.removeInstance(instance)
// 				}
// 			}
// 		}
// 	}
// }


// async function getAndStoreFullRegistry() {
// 	console.log('Getting all instance registry info from the eureka server')
// 	httpResponse = await execute(retryableHttpClient, 'GetApplication', instanceInfo, async (serviceUrl) => {
// 		return await discoverRestHttpClient.getApplications(serviceUrl)
// 	})
// 	if(httpResponse.statusCode == 200) {
// 		apps = JSON.parse(httpResponse.body)
// 	}
// 	console.log('getAndStoreFullRegistry response status is' + httpResponse.statusCode)
// 	if(apps == undefined) {
// 		console.error('The application is null for some reason. Not storing this information')
// 	}
// 	else {
// 		currentApps = new Applications(apps)
// 		currentApps.filterAndShuffle()
// 		localRegionApps = currentApps
// 		console.log('Got full registry with apps hashcode ' + currentApps.applications.apps__hashcode)
// 	}
// }





async function execute(retryableHttpClient, reqyestType, instanceInfo, requestExecutor) {
	return await retryableHttpClient.execute(reqyestType, requestExecutor, instanceInfo)
}






















start()







/**
全量/增量拉取实体Bean

* @author Tim
* @since 2020/6/16


**/


var ServiceInstance = require('./serviceInstance.js')

class Applications {
	appHashCode = ''
	versionDelta = ''
	applications = []
	//ApplicationName 与application的映射
	appNameApplicationMap = new Map()
	instanceMap = new Map()
	//构造函数
	constructor(response) {
		this.appHashCode =  response.applications.apps__hashcode
		this.versionDelta = response.applications.versions__delta
		this.applications = response.applications.application
		for(var index in this.applications) {
			this.appNameApplicationMap.set(this.applications[index].name.toUpperCase(), this.applications[index].instance)
		}
	
	}

	nextServerCyclicCounter = 0

	chooseServer(key) {
		var servers = this.chooseServers(key)
		var length = servers.length
		if(length == 0) {
			throw new Error('No instances available for ' + key.toUpperCase())
		}
		if(length == 1) {
			return servers[0]
		}
		var index = this.nextServerCyclicCounter % length
		this.nextServerCyclicCounter++
		if(this.nextServerCyclicCounter == 10000 || this.nextServerCyclicCounter >= length) {
			this.nextServerCyclicCounter = 0
		}
		return servers[this.nextServerCyclicCounter]
	}

	chooseServers(key) {
		var servers = []
		for(var application of this.appNameApplicationMap) {
		    var appName = application[0]
		    if(appName.toUpperCase() == key.toUpperCase()) {
		    	var instances =  application[1]
			    for(var i = 0; i < instances.length; i++) {
			    	var instance = instances[i]
			    	var instanceId = instance.instanceId
			    	var hostName = instance.hostName
			    	var status = instance.status
			    	var port = instance.port['$']
			    	var zone = instance.metadata.zone
			    	var actionType = instance.actionType
			    	var ipAddress = instance.ipAddr
			    	var status = instance.status
			    	var serviceInstance = new ServiceInstance(instanceId, appName, ipAddress, port, hostName, zone, status, actionType)
			    	if(serviceInstance.checkConfig() == true) {
			    		servers.push(serviceInstance)
			    	}
			    }
		    }
		    
		}
		if(servers.length == 0) {
			throw new Error('No instances available for ' + key.toUpperCase())
		}
		return servers	
	}


	getReconcileHashCode() {
		var array = this.populateInstanceCountArray()
		var code = ''
		for(var i in array) {
			var key = array[i][0]
			var value = array[i][1]
			code += key + '_' + value + '_'
		}
		return code
	} 

	//根据每个instance的status，计算出一个排序后的数组
	populateInstanceCountArray() {
		var map = new Map()
		for(var i in this.applications) {

			var instances = this.applications[i].instance
			for(var j in instances) {
				var value = map.get(instances[j].status)
				if(value == undefined) {
					map.set(instances[j].status, 1)
				}
				else {
					map.set(instances[j].status, value + 1)
				}
			}
		}
		var instanceCountArray = Array.from(map)
		instanceCountArray.sort(function(a,b){return a[0].localeCompare(b[0])})
		return instanceCountArray
	}

	//过滤+乱序，过滤出状态为UP的节点
	filterAndShuffle() {
		for(var i in this.applications) {
			var instances = this.applications[i].instance
			var newInstances = []
			for(var j in instances) {
				if(instances[j].status == 'UP') {
					newInstances.push(instances[j])
				}
			}
			for (var k = newInstances.length - 1; k > 0; k -= 1) {
		        var v = Math.floor(Math.random() * (k + 1));
		        var temp = newInstances[k]
		        newInstances[k] = newInstances[v]
		        newInstances[v] = temp
	    	}
	    	this.applications[i].instance = newInstances
		}
	}



	//添加application
	addApplication(application) {
		this.appNameApplicationMap.set(application.name.toUpperCase(), application.instance)
		this.applications.push(application)
	}

	removeInstance(instance) {
		var appName = instance.app
		var instanceId = instance.instanceId
		this.instanceMap.delete(instanceId)
		this.arrayRemoveElement(this.appNameApplicationMap.get(appName.toUpperCase()), instanceId)
	}

	addInstance(instance) {
		this.instanceMap.set(instance.instanceId, instance)
		var name = instance.app
		var instanceId = instance.instanceId
		this.arrayRemoveElement(this.appNameApplicationMap.get(name.toUpperCase()), instanceId)
		this.appNameApplicationMap.get(name.toUpperCase()).push(instance)
	}

	arrayRemoveElement(array, key) {
		var index = -1
		for(var i = 0; i < array.length; i++) {
			if(array[i].instanceId == key) {
				index = i
				break
			}
		}
		if(index != -1) {
			array.splice(index, 1)
		}
	}
}




module.exports = Applications



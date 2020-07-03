/**
业务代码获取到的服务发现包装类
**/



class ServiceInstance {

	


	schema = 'http'
	appName = ''
	port = ''
	zone = ''
	hostName = ''
	status = 'UP'
	actionType = ''
	ipAddress = ''
	instanceId = ''
	url = ''

	constructor(instanceId, appName, ipAddress, port, hostName, zone, status, actionType) {
		this.appName = appName
		this.ipAddress = ipAddress
		this.port = port
		this.hostName = hostName
		this.zone = zone
		this.status = status
		this.actionType = actionType
		this.instanceId = instanceId
		this.url = this.populateUrl()
	}

	checkConfig() {
		if(this.appName == '' || this.port == '' || this.ipAddress == '' || this.instanceId == '' || this.status != 'UP') {
			return false
		}
		return true
	}

	populateUrl() {
		return this.schema + "://" + this.ipAddress + ":" + this.port + "/"
	}
}

module.exports = ServiceInstance
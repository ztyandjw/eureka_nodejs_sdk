// const region = 'shanghai'
// const serviceUrls = {'shanghai-1': 'http://127.0.0.1:8661/eureka', 'shanghai-2': 'http://127.0.0.1:8662/eureka'}
// const myZone = 'shanghai-1'
// const availableZones = 'shanghai-1,shanghai-2'
// const numberOfRetries = 3
const Config = require('./config.js')
var config = new Config()




const region = config.region
const serviceUrls = config.serviceUrls
const myZone = config.myZone
const availableZones = config.availableZones
const numberOfRetries = 3

class EndPoint {
	constructor(serviceUrl, region, zone) {
		this.serviceUrl = serviceUrl
		this.region = region
		this.zone = zone
	}
}

var candidateHosts = getHostCandidates()


async function execute(requestType, requestExecutor, instanceInfo) {
	if(candidateHosts.length == 0) {
		throw new Error('There is no known eureka server; cluster server list is empty')
	}

	for(retry = 0; retry < numberOfRetries; retry++ ) {
		currentEndPoint = retry % candidateHosts.length
		candidateServer = candidateHosts[currentEndPoint]
		httpResponse = await requestExecutor(candidateServer.serviceUrl, instanceInfo).catch((error)=> {
			console.error('Request execution failed with message:' + error.message)
		})

		if((httpResponse !== undefined) && responseEvaluator(httpResponse, requestType)) {
			if(retry > 0) {
				console.log('Request execution succeeded on retry #' + retry)
			}
			return httpResponse
		}
		console.error('Request execution failure ' + (httpResponse == undefined ? '' :'with status code: ' + httpResponse.statusCode)  + '; retrying on another server if available')
		
	}
	throw new Error('Retry limit reached; giving up on completing the request')
}


function responseEvaluator(response, requestType) {
	statusCode = response.statusCode
	if (statusCode >= 200 && statusCode < 300 || statusCode == 302) {
        return true
    }
    else if(requestType == 'Register' && statusCode == 404) {
    	return true
    }
    else if(requestType == 'SendHeartBeat' && statusCode == 404) {
    	return true
    }
    else if (requestType == 'GetDelta' && (statusCode == 403 || statusCode == 404)) {
        return true
    }
    else {
    	return false
    }
}


//获取注册中心服务端的candidates
function getHostCandidates() {
	//与自己所属同一个可用区的服务
	myZoneArray = []
	//非与自己所属同一个可用区域的服务
	remainingArray = []
	availableZonesArray = []
	//每个元素trimAndToLowerCase
	availableZones.split(',').forEach(n => {
		availableZonesArray.push(trimAndToLowerCase(n))
	})

	for(zone in serviceUrls) {
		//假设不在可用zones列表中
		if(availableZonesArray.indexOf(trimAndToLowerCase(zone)) == -1) {
			continue
		}
		urls = serviceUrls[zone].split(',')
		isMyZone = false
		if(trimAndToLowerCase(myZone) == trimAndToLowerCase(zone)) {
			isMyZone = true
		}

		for(i = 0; i < urls.length; i++) {
			if(isMyZone == true) {			
				if(urls[i].trim().charAt(urls[i].trim().length - 1) !== '/') {
					myZoneArray.push(new EndPoint(urls[i].trim() + '/', region.trim(), zone.trim()))
				}
				else {
					remainingArray.push(new EndPoint(urls[i].trim(), region.trim(), zone.trim()))
				}
			}
		}
		
	}
	return myZoneArray.concat(remainingArray)

}


function trimAndToLowerCase(value) {
	return value.trim().toLowerCase()
}

exports.execute = execute





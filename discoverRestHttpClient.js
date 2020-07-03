/**

restful调用接口类

* @author Tim
* @since 2020/6/16

**/


const request = require('request')

//restful形式访问服务端，进行心跳逻辑
async function sendHeardBeat(serviceUrl, instanceInfo) {
	url = serviceUrl + 'apps/' + instanceInfo.getAppName() + '/' + instanceInfo.getId() + '?status=UP&lastDirtyTimestamp='
		+ instanceInfo.getLastDirtyTimestamp()
	return new Promise( (resolve, reject) =>  {
		request({
			url: url,
			method: 'put',
			},function(error,response,body) {
			
			if(error) {
				reject(error)
			}
			else {
				resolve(response)
			}
		})
	})
}

//restful形式访问服务端，进行注册逻辑
async function register(serviceUrl, instanceInfo) {
	var wrapper = {}
	wrapper['instance'] = instanceInfo

	return new Promise( (resolve, reject) =>  {
		request({
			url: serviceUrl + 'apps/' + instanceInfo.getAppName(),
			method: 'post',
			headers: {
				'Accept-Encoding': 'gzip',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(wrapper)
		},function(error,response,body) {
			if(error) {
				reject(error)
			}
			else {
				resolve(response)
			}
		})
	})
}


//restful形式访问服务端，全量拉取逻辑
async function getApplications(serviceUrl) {
	return new Promise((resolve, reject) =>  {
		request({
			url: serviceUrl + 'apps',
			method: 'get',
			headers: {
				'Accept': 'application/json, application/*+json'
			}
		},function(error,response,body) {
			if(error) {
				reject(error)
			}
			else {
				resolve(response)
			}
		})
	})
}

//restful形式访问服务端，增量拉取逻辑
async function getDelta(serviceUrl) {
	return new Promise((resolve, reject) =>  {
		request({
			url: serviceUrl + 'apps/delta',
			method: 'get',
			headers: {
				'Accept': 'application/json, application/*+json'
			}
		},function(error,response,body) {
			if(error) {
				reject(error)
			}
			else {
				resolve(response)
			}
		})
	})
}

exports.register = register

exports.sendHeardBeat = sendHeardBeat

exports.getApplications = getApplications

exports.getDelta = getDelta

// var instanceInfoFactory = require('./instanceInfoFactory')
// var instanceInfo = instanceInfoFactory.create('123',123)
// async function test() {
// 	response = await getApplicationsInternal('http://127.0.0.1:8661/eureka/')
// 	object = JSON.parse(response.body)
// 	console.log('fuck')
// 	l = object.applications.application
// 	l.forEach((n) => {
// 		console.log(n)
// 	})
// }

// test()

// async function test() {
// 	console.log(JSON.stringify(instanceInfo))
// 	a = await register('http://127.0.0.1:8661/eureka/', instanceInfo).catch(err => {
// 	})
// 	b = await sendHeardBeat('http://127.0.0.1:8661/eureka/', instanceInfo).catch(err => {
// 	})
// }

// async function test() {
// 	a = await getDelta('http://127.0.0.1:8661/eureka/').catch((err) => {
// 		console.log(err)
// 	})
// 	console.log('!!!!!!!!' + JSON.stringify(a))
// }


// test()

// async function test() {
// 	var a = await getApplications('http://127.0.0.1:8661/eureka/')
// 	console.log(a)
// }



// await test()

// console.log('???')
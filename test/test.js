const discoverClient  = require('../discoverClient.js')


discoverClient.start()

function testChooseServers() {
	try {
		var servers = discoverClient.chooseServers('node-provider1')
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
		console.log('选择服务[列表]')
		console.log('实例名称: node-provider1' +  '实例数量: ' + servers.length)
		
		for(var i = 0; i <servers.length; i++) {
			
			console.log('应用名称: ' + servers[i].appName)
			console.log('实例名称: ' + servers[i].instanceId)
			console.log('ip地址: ' + servers[i].ipAddress)
			console.log('服务端口: ' + servers[i].port)
			console.log('服务地址: ' + servers[i].url)
			console.log('=====================================')

		}
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')

	}
	catch(error) {
		console.log(error)
	}
}



function testChooseServer() {
	try {
		var server = discoverClient.chooseServer('node-provider1')
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
		console.log('选择服务[单个]')
		console.log('实例名称: node-provider1')
		console.log('应用名称: ' + server.appName)
		console.log('实例名称: ' + server.instanceId)
		console.log('ip地址: ' + server.ipAddress)
		console.log('服务端口: ' + server.port)
		console.log('服务地址: ' + server.url)
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
	}
	catch(error) {
		console.log(error)
	}
}


function testChooseServersLoop() {
	setInterval(()=> {
        testChooseServers()
    }, 8 * 1000)
}

function testChooseServerLoop() {
	setInterval(()=> {
        testChooseServer()
    }, 11 * 1000)
}



testChooseServersLoop()
testChooseServerLoop()


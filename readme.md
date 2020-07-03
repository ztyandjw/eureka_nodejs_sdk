eureka的node客户端



### 配置

修改config.js中的参数配置

如下三个参数必须修改

* serviceUrls: 配置服务端地址
* appName: 应用名称
* port: 应用端口

其他参数与region zone 云计算中的地区与可用区，优先选择相同可用区的应用进行调用

```
class Config {

	region = 'shanghai'
	serviceUrls = {'shanghai-1': 'http://127.0.0.1:8661/eureka'}
	myZone = 'shanghai-1'
	availableZones = 'shanghai-1'
	numberOfRetries = 3

	appName = 'client123'
	port = 3434
	myZone = 'shanghai-1'
}
```

### 接入

将node_discover_sdk 放入应用的node_modules, 引入discoverClient模块，调用该模块的start方法

```
const discoverClient = require('node_discover_sdk')

//启动监听3000端口
app.listen(3000,function(){
    console.log('Example app listening on port 3000!')
    
    //启动服务发现
    discoverClient.start()
})

```

### api使用

在访问其他应用生成url之前，通过欲调用应用的名称，得到对应的服务列表，提供了两个API方法，单服务，和多服务

#### 单服务

通过roundRobbin轮询 选择出一个服务实例，这里欲调用应用名称为node-provider1

其中server.url就是对端地址  e.g:  http://10.100.100.22:8080/

注意: 如果此时node-provider1没有对应实例,这里会抛出error, 注意try... catch

```
var server = discoverClient.chooseServer('node-provider1')
console.log('应用名称: ' + server.appName)
console.log('实例名称: ' + server.instanceId)
console.log('ip地址: ' + server.ipAddress)
console.log('服务端口: ' + server.port)
console.log('服务地址: ' + server.url)

```

#### 多服务

将node-provider1对应的所有服务实例返回

```
var servers = discoverClient.chooseServers('node-provider1')
	console.log('选择服务[列表]')
	console.log('实例名称: node-provider1' +  '实例数量: ' + servers.length)
	for(var i = 0; i <servers.length; i++) {
	console.log('应用名称: ' + servers[i].appName)
	console.log('实例名称: ' + servers[i].instanceId)
	console.log('ip地址: ' + servers[i].ipAddress)
	console.log('服务端口: ' + servers[i].port)
	console.log('服务地址: ' + servers[i].url)

}
```


/**
InstanceInfo与LeaseInfo的工厂模块


* @author Tim
* @since 2020/6/16

**/

const os = require('os')


//LeaseInfo的Builder类
class LeaseInfoBuilder {
    static newBuilder() {
        var builder = new LeaseInfoBuilder()
        builder.leaseInfo = new LeaseInfo()
        return builder
    }
}


class LeaseInfo {
	constructor(){
      this.renewalIntervalInSecs = 30
      this.durationInSecs = 90
      this.registrationTimestamp = 0
      this.lastRenewalTimestamp = 0
      this.renewalTimestamp = 0
      this.evictionTimestamp = 0
      this.serviceUpTimestamp = 0
    }
}

//instanceInfo的Builder类
class InstanceInfoBuilder {
    static newBuilder(appName, port, myZone) {
        var builder = new InstanceInfoBuilder()

        builder.instanceInfo = new InstanceInfo(appName, port)
        
        if(myZone != undefined && myZone != null) {
            builder.instanceInfo.setMyZone(myZone)
        }
        return builder
    }
}


class InstanceInfo {
    isInstanceInfoDirty = false
    constructor(appName, port) {
        this.instanceId = InstanceInfo.generateHostName() + ":" + appName + ":" + port
        this.app = appName
        this.hostName = InstanceInfo.generateHostName()
        this.status = 'UP'
        this.overriddenStatus = 'UNKNOWN'
        this.ipAddr = InstanceInfo.generateIpAddress()
        this.lastUpdatedTimestamp = new Date().valueOf()
        this.lastDirtyTimestamp = this.lastUpdatedTimestamp
        var obj = {}
        obj['@class'] = "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo"
        obj['name'] = 'MyOwn'
        this.dataCenterInfo = obj
        var  leaseInfoBuilder = LeaseInfoBuilder.newBuilder()
        var leaseInfo = leaseInfoBuilder.leaseInfo
        this.leaseInfo = leaseInfo
        obj = {}
        obj['@enabled'] = true
        obj['$'] = port
        this.port = obj
    }


    static generateHostName() {
　　    return os.hostname()
    }
    static generateIpAddress() {
      var interfaces = os.networkInterfaces();
      for (var devName in interfaces) {
          var iface = interfaces[devName];
          for (var i = 0; i < iface.length; i++) {
              var alias = iface[i]
              if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                  return alias.address
              }
          }
      }
    }
    
    setMyZone(myZone) {
        if(myZone != null && myZone != undefined) {
            var obj = {}
            obj['zone'] = myZone
            this.metadata = obj
        }
    }
 
    getAppName() {
        return this.app
    }

    getId() {
        return this.instanceId
    }

    getLastDirtyTimestamp() {
        return this.lastDirtyTimestamp
    }

    //假设isDirty=true，返回lastDirtyTimeStamp，如果不为true，返回null
    isDirtyWithTime() {
        if(this.isInstanceInfoDirty) {
            return this.lastDirtyTimestamp
        }
        else {
            return null
        }
    }


    unsetIsDirty(unsetDirtyTimestamp) {
        if(this.lastDirtyTimestamp <= unsetDirtyTimestamp) {
            this.isInstanceInfoDirty = false
        }
    }

    setIsDirtyWithTime() {
        this.setIsDirty()
        return this.instance.lastDirtyTimestamp
    }

    //instanceInfoDirty置为true，lastDirtyTimestamp设置为当前时间
    setIsDirty() {
        this.isInstanceInfoDirty = true
        this.lastDirtyTimestamp = new Date().valueOf()
    }
}


//供外界调用，new出instanceInfo
function getInstanceInfo(appName, port, myZone) {
    var  instanceInfoBuilder = InstanceInfoBuilder.newBuilder(appName, port, myZone)
    var instanceInfo = instanceInfoBuilder.instanceInfo
    return instanceInfo
}


exports.getInstanceInfo = getInstanceInfo


import express from 'express'
import logger from 'morgan'
import bodyParser from 'body-parser'
import cors from 'cors'
import io from 'socket.io'
import mqtt from 'mqtt'

import config from './config/config'
import containerModel from './models/containers'
import { createContainer, asValue } from 'awilix'
import { loadControllers, scopePerRequest } from 'awilix-express'

let app = express()

app.use(cors())
app.use(logger('combined'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))

var port = config.APP_PORT || 4000

const server = app.listen(port, () => {
  console.log('server up and running at: ' + port)
})

const ioServer = io.listen(server)

createContainerDI(app, ioServer)

function createContainerDI(app, io) {

  const container = createContainer()
    .register({
      config: asValue(config),
      containerModel: asValue(containerModel),
      ioServer: asValue(io.sockets),
      mqttServer: asValue(mqtt)
    })

  const opts = {
    formatName: 'camelCase',
    cwd: __dirname
  }

  container.loadModules(
    [
      'services/*.js',
      'factories/*.js',
      'handlers/*.js',
    ],
    opts
  )

  app.use(scopePerRequest(container))
  app.use(loadControllers('controllers/*.js', { cwd: __dirname }))

  container.cradle.newMeasurementhandler.listen()
}

export default server
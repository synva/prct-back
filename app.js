import express from 'express'
import expressSession from 'express-session'
import path from 'path'
import bodyParser from 'body-parser'
import conf from 'config'
import http from 'http'
import cluster from 'cluster'
import os from 'os'
import logger from './services/logger.js'
import mongo from './services/mongo.js'
import compression from 'compression'
import passport from 'passport'
import flash from 'connect-flash'
import privateHttpRouter from './routers/privateHttpRouter.js'
import publicHttpRouter from './routers/publicHttpRouter.js'
import userService from './services/userService.js'
import utils from './services/utils.js'

logger.info('NODE_ENV:', process.env.NODE_ENV)

const startupExpress = async () => {
  const app = express()
  // app.set('views', path.join(__dirname, 'dist'))
  app.use(
    compression({
      filter: (req, res) => {
        const contentType = res.get('Content-Type')
        if (contentType && contentType.indexOf('application/json') === -1) {
          return false
        }
        return compression.filter(req, res)
      }
    })
  )
  app.use(bodyParser.json({limit: '2gb'}))
  app.use(bodyParser.urlencoded({limit: '2gb', extended: true}))




  const allowCrossDomain = (req, res, next) => {
    let origin = null
    if (req.headers.origin) origin = conf.cors.indexOf(req.headers.origin.toLowerCase()) > -1 ? req.headers.origin : null
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin)
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
      res.header('Access-Control-Allow-Credentials', true)
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With')
    }

    // intercept OPTIONS method
    if ('OPTIONS' === req.method) {
      res.sendStatus(200)
    } else {
      next()
    }
  }
  app.all('*', allowCrossDomain)






  const expressMongoStore = require('connect-mongo')(expressSession)
  const store = new expressMongoStore({
    url: 'mongodb://' + conf.mongo.user + ':' + conf.mongo.password + '@' + conf.mongo.server + ':' + conf.mongo.port + '/' + conf.mongo.db,
    clear_interval: 60 * 60
  })
  const session = expressSession({
    store: store,
    cookie: {
      path: conf.session.path,
      httpOnly: false,
      maxAge: conf.session.cookieMaxAge
    },
    key: conf.session.key,
    secret: conf.session.secret,
    resave: false,
    saveUninitialized: false
  })
  app.use(session)
  privateHttpRouter.use(session)





  const LocalStrategy = require('passport-local').Strategy
  const strategy = new LocalStrategy(
    (username, password, next) => {
      userService.authenticate(username, password).then((result) => {
        next(null, result)
      }).catch(error => {
        next(error, null)
      })
    }
  )
  passport.use(strategy)
  passport.serializeUser((user, done) => {
    done(null, user)
  })
  passport.deserializeUser((user, done) => {
    done(null, user)
  })
  app.use(flash())
  app.use(passport.initialize())
  app.use(passport.session())




  app.post('/authenticate',
    passport.authenticate('local'),
    async (req, res, next) => {
      if (req.session && req.session.passport && req.session.passport.user && req.session.passport.user._id) {
        logger.debug('auth success:', JSON.stringify(req.session.passport.user._id))
        const user = await userService.recordLogin(req.session.passport.user).catch(next)
        res.json({error: null, data: {user: user}})
      } else {
        res.json({error: {code: 'S002'}, data: null})
      }
    }
  )




  const checkAuth = (req, res, next) => {
    if (req.session && req.session.passport && req.session.passport.user) {
      logger.debug('http session:', req.session.passport.user._id)
      next()
    } else {
      logger.error('miss session.')
      res.json({error: {code: 'B002'}, data: null})
    }
  }
  app.use('/private', checkAuth, privateHttpRouter)
  app.use('/public', publicHttpRouter)




  const commonResponseHeader = (req, res, next) => {
    res.header('X-XSS-Protection', '1; mode=block')
    res.header('X-Frame-Options', 'DENY')
    res.header('X-Content-Type-Options', 'nosniff')
    next()
  }
  app.all('/*', commonResponseHeader)




  app.get('/login', (req, res) => {
    if (!req.session || !req.session.passport || !req.session.passport.user) {
      logger.info('need authenticate')
      res.json({error: null, data: {user: null}})
    } else {
      logger.info('login success:', JSON.stringify(req.session.passport.user._id))
      userService.recordLogin(req.session.passport.user).then(user => {
        res.json({error: null, data: {user: user}})
      }).catch(error => {
        res.json({error: error, data: {user: null}})
      })
    }
  })
  app.post('/register', (req, res) => {
    logger.info('register:', JSON.stringify(req.body))
    userService.addUser(req.body.user).then(user => {
      res.json({error: null, data: {user: user}})
    }).catch(error => {
      res.json({error: error, data: {user: null}})
    })
  })
  app.get('/logout', (req, res) => {
    logger.info('logout')
    if (req.session && req.session.passport && req.session.passport.user) {
      logger.info('user:', req.session.passport.user._id)
    }
    req.logout()
    res.json({error: null, data: {}})
  })



  app.use((err, req, res) => {
    logger.error(err)
    res.json({error: err, data: null})
  })



  app.get('*', (req, res) => {
    let file = req.originalUrl
    if (file === '/') file = 'index.html'
    if (file.split('?v=').length > 1) file = file.split('?v=')[0]
    if (!utils.isFileExist(path.join(__dirname, 'dist', file))) file = 'index.html'
    res.sendFile(path.join(__dirname, 'dist', file))
  })



  let server = http.createServer(app)
  let onListening = () => {
    let addr = server.address()
    let bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port
    logger.info('Listening on', bind)
  }
  await mongo.init()
  await server.listen(conf.port)
  await server.on('listening', onListening)
}

if (process.env.NODE_ENV === 'development') {
  startupExpress().catch(error => {
    logger.error(error)
  })
} else {
  if (cluster.isMaster) {
    let confInstance = 1
    if (conf.cluster) confInstance = conf.cluster.instances
    let numCPUs = os.cpus().length
    if (confInstance > numCPUs) confInstance = numCPUs

    for (let i = 0; i < confInstance; i++) {
      // Create a worker
      cluster.fork()
    }
  } else {
    startupExpress().catch(error => {
      logger.error(error)
    })
  }
}

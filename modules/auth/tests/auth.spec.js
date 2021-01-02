/* istanbul ignore file */
const crs = require( 'crypto-random-string' )
const chai = require( 'chai' )
const request = require( 'supertest' )
const assert = require( 'assert' )
const appRoot = require( 'app-root-path' )
const { init, startHttp } = require( `${appRoot}/app` )

const expect = chai.expect

const knex = require( `${appRoot}/db/knex` )

describe( 'Auth @auth', ( ) => {

  describe( 'Local authN & authZ (token endpoints)', ( ) => {
    let expressApp, testServer

    before( async ( ) => {
      await knex.migrate.rollback( )
      await knex.migrate.latest( )

      let { app } = await init( )
      let { server } = await startHttp( app )
      expressApp = app
      testServer = server
    } )

    after( async ( ) => {
      await knex.migrate.rollback( )
      await testServer.close()
    } )

    it( 'Should register a new user (speckle frontend)', async ( ) => {
      let res =
        await request( expressApp )
          .post( '/auth/local/register?challenge=test&suuid=test' )
          .send( { email: 'spam@speckle.systems', name: 'dimitrie stefanescu', company: 'speckle', password: 'roll saving throws' } )
          .expect( 302 )
      // console.log( res.body )
      expect( res.body.id ).to.be.a.string
    } )

    it( 'Should fail to register a new user w/o password (speckle frontend)', async ( ) => {
      let res =
        await request( expressApp )
          .post( '/auth/local/register?challenge=test' )
          .send( { email: 'spam@speckle.systems', name: 'dimitrie stefanescu' } )
          .expect( 400 )
    } )

    it( 'Should log in (speckle frontend)', async ( ) => {
      let res =
        await request( expressApp )
          .post( '/auth/local/login?challenge=test' )
          .send( { email: 'spam@speckle.systems', password: 'roll saving throws' } )
          .expect( 302 )
    } )

    it( 'Should fail nicely to log in (speckle frontend)', async ( ) => {
      let res =
        await request( expressApp )
          .post( '/auth/local/login?challenge=test' )
          .send( { email: 'spam@speckle.systems', password: 'roll saving throw' } )
          .expect( 401 )
    } )

    it( 'Should redirect login with access code (speckle frontend)', async ( ) => {

      let appId = 'sdm'
      let challenge = 'random'

      let res =
        await request( expressApp )
          .post( `/auth/local/login?challenge=${challenge}` )
          .send( { email: 'spam@speckle.systems', password: 'roll saving throws' } )
          .expect( 302 )

      let accessCode = res.headers.location.split( 'access_code=' )[ 1 ]
      expect( accessCode ).to.be.a( 'string' )

    } )

    it( 'Should redirect registration with access code (speckle frontend)', async ( ) => {

      let appId = 'sdm'
      let challenge = 'random'

      let res =
        await request( expressApp )
          .post( `/auth/local/register?challenge=${challenge}` )
          .send( { email: 'spam_2@speckle.systems', name: 'dimitrie stefanescu', company: 'speckle', password: 'roll saving throws' } )
          .expect( 302 )

      let accessCode = res.headers.location.split( 'access_code=' )[ 1 ]
      expect( accessCode ).to.be.a( 'string' )

    } )

    it( 'Should exchange a token for an access code (speckle frontend)', async ( ) => {

      let appId = 'sdm'
      let challenge = 'random'

      let res =
        await request( expressApp )
          .post( `/auth/local/login?challenge=${challenge}` )
          .send( { email: 'spam@speckle.systems', password: 'roll saving throws' } )
          .expect( 302 )

      let accessCode = res.headers.location.split( 'access_code=' )[ 1 ]

      let tokenResponse = await request( expressApp )
        .post( '/auth/token' )
        .send( { appId, appSecret: 'sdm', accessCode, challenge } )
        .expect( 200 )

      expect( tokenResponse.body.token ).to.exist
      expect( tokenResponse.body.refreshToken ).to.exist

    } )

    it( 'Should NOT exchange a token for an access code with a wrong challenge, app secret, spoofed access code, or malformed input (speckle frontend)', async ( ) => {

      let appId = 'sdm'
      let challenge = 'random'

      let res =
        await request( expressApp )
          .post( `/auth/local/login?challenge=${challenge}` )
          .send( { email: 'spam@speckle.systems', password: 'roll saving throws' } )
          .expect( 302 )

      let accessCode = res.headers.location.split( 'access_code=' )[ 1 ]

      // Spoof the challenge
      let tokenResponse = await request( expressApp )
        .post( '/auth/token' )
        .send( { appId, appSecret: 'sdm', accessCode, challenge: 'WRONG' } )
        .expect( 401 )

      // Spoof the secret
      tokenResponse = await request( expressApp )
        .post( '/auth/token' )
        .send( { appId, appSecret: 'spoof', accessCode, challenge } )
        .expect( 401 )

      // Swap the app
      tokenResponse = await request( expressApp )
        .post( '/auth/token' )
        .send( { appId: 'spklwebapp', appSecret: 'spklwebapp', accessCode, challenge } )
        .expect( 401 )

      // Send pure garbage
      tokenResponse = await request( expressApp )
        .post( '/auth/token' )
        .send( { accessCode, challenge } )
        .expect( 401 )

    } )

    it( 'Should refresh a token (speckle frontend)', async ( ) => {

      let appId = 'sdm'
      let challenge = 'random'

      let res =
        await request( expressApp )
          .post( `/auth/local/login?challenge=${challenge}` )
          .send( { email: 'spam@speckle.systems', password: 'roll saving throws' } )
          .expect( 302 )

      let accessCode = res.headers.location.split( 'access_code=' )[ 1 ]

      let tokenResponse = await request( expressApp )
        .post( '/auth/token' )
        .send( { appId, appSecret: 'sdm', accessCode, challenge } )
        .expect( 200 )

      expect( tokenResponse.body.token ).to.exist
      expect( tokenResponse.body.refreshToken ).to.exist

      let refreshTokenResponse = await request( expressApp )
        .post( '/auth/token' )
        .send( { refreshToken: tokenResponse.body.refreshToken, appId, appSecret: 'sdm' } )
        .expect( 200 )

      expect( refreshTokenResponse.body.token ).to.exist
      expect( refreshTokenResponse.body.refreshToken ).to.exist
    } )

    it( 'Should NOT refresh a token with bad juju inputs (speckle frontend)', async ( ) => {

      let appId = 'sdm'
      let challenge = 'random'

      let res =
        await request( expressApp )
          .post( `/auth/local/login?challenge=${challenge}` )
          .send( { email: 'spam@speckle.systems', password: 'roll saving throws' } )
          .expect( 302 )

      let accessCode = res.headers.location.split( 'access_code=' )[ 1 ]

      let tokenResponse = await request( expressApp )
        .post( '/auth/token' )
        .send( { appId, appSecret: 'sdm', accessCode, challenge } )
        .expect( 200 )

      expect( tokenResponse.body.token ).to.exist
      expect( tokenResponse.body.refreshToken ).to.exist

      // spoof secret
      let refreshTokenResponse = await request( expressApp )
        .post( '/auth/token' )
        .send( { refreshToken: tokenResponse.body.refreshToken, appId, appSecret: 'WRONG' } )
        .expect( 401 )

      // swap app (use on rt for another app)
      refreshTokenResponse = await request( expressApp )
        .post( '/auth/token' )
        .send( { refreshToken: tokenResponse.body.refreshToken, appId: 'spklwebapp', appSecret: 'spklwebapp' } )
        .expect( 401 )

    } )

    let frontendCredentials

    it( 'Should get an access code (redirected response)', async() => {
      let appId = 'spklwebapp'
      let challenge = 'random'

      let res =
        await request( expressApp )
          .post( `/auth/local/login?challenge=${challenge}` )
          .send( { email: 'spam@speckle.systems', password: 'roll saving throws' } )
          .expect( 302 )

      let accessCode = res.headers.location.split( 'access_code=' )[ 1 ]

      let tokenResponse = await request( expressApp )
        .post( '/auth/token' )
        .send( { appId, appSecret: appId, accessCode, challenge } )
        .expect( 200 )

      expect( tokenResponse.body.token ).to.exist
      expect( tokenResponse.body.refreshToken ).to.exist

      frontendCredentials = tokenResponse.body

      let response = await request( expressApp )
        .get( `/auth/accesscode?appId=explorer&challenge=${crs( { length: 20 } )}&token=${tokenResponse.body.token}` )
        .expect( 302 )

      expect( response.text ).to.include( '?access_code' )
    } )

    it( 'Should not get an access code on bad requests', async() => {

      // Spoofed app
      let response = await request( expressApp )
        .get( `/auth/accesscode?appId=lol&challenge=${crs( { length: 20 } )}&token=${frontendCredentials.token}` )
        .expect( 400 )

      // Spoofed token
      response = await request( expressApp )
        .get( `/auth/accesscode?appId=sdm&challenge=${crs( { length: 20 } )}&token=I_AM_HACZ0R` )
        .expect( 400 )

      // No challenge
      response = await request( expressApp )
        .get( `/auth/accesscode?appId=explorer&token=${frontendCredentials.token}` )
        .expect( 400 )
    } )

    it( 'Should not freak out on malformed logout request', async() => {

      let response = await request( expressApp )
        .post( '/auth/logout' )
        .send( { adsfadsf: frontendCredentials.token } )
        .expect( 400 )

    } )

    it( 'Should invalidate tokens on logout', async() => {

      let response = await request( expressApp )
        .post( '/auth/logout' )
        .send( { ... frontendCredentials } )
        .expect( 200 )

    } )

    it( 'ServerInfo Query should return the auth strategies available', async ( ) => {

      const query = 'query sinfo { serverInfo { authStrategies { id name icon url color } } }'
      const res = await sendRequest( null, { query } )
      expect( res.body.errors ).to.not.exist
      expect( res.body.data.serverInfo.authStrategies ).to.be.an( 'array' )

    } )

  } )

} )

const serverAddress = `http://localhost:${process.env.PORT || 3000}`

function sendRequest( auth, obj, address = serverAddress ) {

  return chai.request( address ).post( '/graphql' ).set( 'Authorization', auth ).send( obj )

}

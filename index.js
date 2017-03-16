const micro = require('micro')
const stripe = require('stripe')('sk_test_TrkNTx6ieFrACpGxHi0jHUmC')
const firebase = require("firebase-admin")
const { composeP, compose} = require("ramda")

const { json, send } = micro

firebase.initializeApp( {
  credential: firebase.credential.cert({
    "type": "service_account",
    "project_id": "koken-addons",
    "private_key_id": "a1ece9062dda89f48601ef2238454fea5c72851a",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCzzmEqg5wKZde8\n7WMKPYrw5dzDCMSUR+527ze/aJW+Mbo+BevWcbQfLdWB5vWj3eV0dOBx5xh4ELY7\nThLDkYgMyIKRglQ3RqvhzIDp79BztkqEoCkzXZJij7nPfV6PIHeLqa0dQ8qS2aVN\nB68k4iVHdJiOK8UMTHg2h+GYFzwk8G8TMinKKItK8JM1R2vgyHTTnvaPlRtPmC3H\ndrxdrAPStSuuu70Ot909Ivu1nQCo8oLx23+lNVmFf0KjSsV18YbyJWQh5AwpD6kg\n9dQeoPSAYAkLO4kuulwBCKIQgUWt5xE84YSg9Qv+Q5tBbgrO/2v1SnNARReUJVbX\nXDVC8so5AgMBAAECggEANnlNCMNMr/3AyZUlz0Fr6aXKJzBt1fqg7Vl2C0BVNYT9\nRrMmixZxmoyZRbzCKL4eORT7tqZrzFxLyVXS63sYu763h/vzJbf8dPEvETC9d4D/\nvISFVvF/WuruQUVbM4ODlEV4lAgoxCq6IMc2Mbdt0eMqINBz51D3jpXGK/zGFO5b\n/uaNwCaOv//Nrf+4Ovkq8HyF9CUEj/8lwT4biSN3GzUJwujJr0IUZUOwd74jHG54\nqfYtWoNk9ED8DvE1411EkNyEYirStlSMWalPH+QOLVpVPQZCtnjA8Hiv1M6/+5x1\nYWMeRb6ePELG1uDdtNxHSVdXWXGrg0QlbKTOldgFgQKBgQDvgB47v8agGQOTybfE\nm14gTADq0KGkLY1rvfi50zOeup/7aybciZOZLpF7Iw+ieiw2KQkEqjno7/VqXf8D\nmocVceet4n6CMYrcpPwuJz7MaTc9S5c2Dv5cZS25dTn6xaBQvueRV+gufdXgb7Ba\nUdfb4wk+fotvxDZ1nu6XRN1fEQKBgQDAMXrjhfZmu695ZR9FWWHY7/VUPMDI7dPB\n8Rl7eoIWb2iO49CKVuigBYq1+MBCpdafMak+NFyFimLqVdxO54IDd2HWFfECXTtm\nezS6nn5T9jJyC0gP9x0ojjtFQ/67Fr0ghlMtdmXlHEJQ7ftC2KWYOZJckxbZoipp\ntqcAyW6IqQKBgQDNbEKCVRd0sn/S/y3UQL8XTJlszs4WF8w5IZR5LqIT/1bBO0L1\n3jrvJHY7+/KpFcleGwxVJ/zLwyXouf7FhIFg73YcOyzvVrcYUZrLq3W9tnFe7bsg\n7vNVJKN3cwjsAx5io5vTmmbXma8c9i95CMHxJGcFZ10J3G4prMxQiwylQQKBgGjP\nkxDZUZKc8Ajn2LHdGLtRwRx7NTdeW4j8jsUD/kV15DNokaWf16TM4OR0D4VJI04V\nqxI9Q+efnGnnAQoWvpRdWoGB3blIVsiAkDTlkkb/kGsZM+dhAAnJ5xDTD+u/bsx5\n9Ipqcw8K5i90WP4PX98wJl1N6bwt76tO7KxFLX5hAoGBAO5G9ZX1XQhSMDz7Gmki\n3j7+fM29HxsmrKY8e4uPnWczu0p5XiK6zqKCe6vhtPaAEvjS0EklMtLADcR/RmP7\nhO987+Co8kKeq3LRRWT7XC96UG6dICaC/hV9+0u+Z7vzIsuauUhTTeMJ3EU2IN0i\nbiOFfPqqSJMo1JcKMZTuRiYb\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-ni2uy@koken-addons.iam.gserviceaccount.com",
    "client_id": "106497805768810006855",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://accounts.google.com/o/oauth2/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-ni2uy%40koken-addons.iam.gserviceaccount.com"
  }),
  databaseURL: "https://koken-addons.firebaseio.com",
});


/**
 * Create a charge
 * @param token
 */
const createCharge = async token  =>
  stripe.charges.create({
    amount: 6000,
    currency: "usd",
    description: "Example charge",
    source: token,
  })


/**
 * Create or retrieve a user
 * @param email
 * @param password
 */
const createOrGetUser = async (email, password) => {
  const auth = firebase.auth()
  try {
    return await auth.getUserByEmail(email)
  } catch(e) {
    return await auth.createUser({ email, password })
  }
}

/**
 * Save the charge to the user
 * @param user
 */
const addChargeToUser = user => charge => {


  const chargeRef = firebase.database()
    .ref(`users/${user.uid}/charges/${charge.id}`)

  const chargeValues = {
    amount: charge.amount,
    livemode: charge.livemode,
    paid: charge.paid,
    status: charge.status,
    description: charge.description,
  }

  // async
  chargeRef.set(chargeValues);

  return { user, charge }

}

const server = micro(async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');

  const { token, email, password} = await json(req)

  const user = await createOrGetUser(email, password)

  if(req.url === '/user/create' && req.method === 'POST') {

    const user = await createOrGetUser(email, password)

    const createChargeAndAddToUser = composeP(addChargeToUser(user), createCharge)

    return createChargeAndAddToUser(token)

  }

  const statusCode = 404
  const data = { error: 'Not found' }
  return send(res, statusCode, data)

})

server.listen(3001)
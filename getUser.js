const getUser = async token => {
  try {
    return await firebase.auth().verifyIdToken(token)
  } catch(e) {
    return send(res, 400, e)
  }
}
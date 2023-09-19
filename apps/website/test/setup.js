require('dotenv').config()

// Needed to test Remix loaders & actions.
const { installGlobals } = require('@remix-run/node')
installGlobals();

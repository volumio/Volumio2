var express = require('express');
var router = express.Router();
/* GET home page. */
router.get('/', function (req, res) {
  res.render('index', { title: 'Volumio Test Player' });
});
module.exports = router;

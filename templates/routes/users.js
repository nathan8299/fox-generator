import {routing} from '@mirana/fox';
import User from './../models/User';

let route = new routing.Route('/users'); // you can set prefix here

// you can also add middleware here
//route.use('/scope', (req, res, next) => {
//    // do something...
//    next();
//});

route.get('/', (req, res, next) => {
  User.find((err, users) => {
    if (err) return res.json({message: 'Internal Server Error'}, 500);
    return res.json({users});
  });
});

export default route;

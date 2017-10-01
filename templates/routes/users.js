import {routing} from '@mirana/fox';
import User from './../models/User';

let route = new routing.Route();

route.get('/users', (req, res, next) => {
  User.find((err, users) => {
    if (err) return res.json({message: 'Internal Server Error'}, 500);
    return res.json({users});
  });
});

export default route;

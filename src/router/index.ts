import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';

import StationsView from '../views/StationsView.vue';
import TrainsView from '../views/TrainsView.vue';
import TimetableView from '../views/TimetableView.vue';

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'StationsView',
    component: StationsView,
  },
  {
    path: '/trains',
    name: 'TrainsView',
    component: TrainsView,
    props: true,
  },
  {
    path: '/timetable',
    name: 'TimetableView',
    component: TimetableView,
    props: true
  }
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
});

export default router;

// Stub for react-native-maps on web — the map screen uses map.web.tsx instead
const React = require("react");
const { View } = require("react-native");

const MapView = (props) => React.createElement(View, props);
MapView.displayName = "MapView";

const Marker = (props) => React.createElement(View, props);
Marker.displayName = "Marker";

const Polyline = (props) => React.createElement(View, props);
Polyline.displayName = "Polyline";

const Circle = (props) => React.createElement(View, props);
Circle.displayName = "Circle";

const Callout = (props) => React.createElement(View, props);
Callout.displayName = "Callout";

const PROVIDER_DEFAULT = null;
const PROVIDER_GOOGLE = null;

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Marker;
module.exports.Polyline = Polyline;
module.exports.Circle = Circle;
module.exports.Callout = Callout;
module.exports.PROVIDER_DEFAULT = PROVIDER_DEFAULT;
module.exports.PROVIDER_GOOGLE = PROVIDER_GOOGLE;

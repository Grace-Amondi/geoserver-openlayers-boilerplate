// import modules
import "ol/ol.css"
import { Map, View } from 'ol'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import TileWMS from 'ol/source/TileWMS'
import { defaults as defaultControls, ScaleLine,ZoomSlider, OverviewMap,ZoomToExtent} from 'ol/control'
import WFS from 'ol/format/WFS'
import GeoJSON from 'ol/format/GeoJSON'
import VectorSource from 'ol/source/Vector'
import { Vector as VectorLayer } from 'ol/layer'
import { Stroke, Style } from 'ol/style.js';
import Overlay from 'ol/Overlay.js';


// get information container
var sidebar = document.getElementById('sidebar')
var attributeTable = document.getElementById('attribute')
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

// define view
const view = new View({
  projection: 'EPSG:4326',
  center: [37.0400, -0.7839],
  zoom: 13
})

var vectorSource = new VectorSource();
var vector = new VectorLayer({
  source: vectorSource,
  style: new Style({
    stroke: new Stroke({
      color: 'rgba(0, 0, 255, 1.0)',
      width: 2
    })
  })
});
// define projection and resolution
var viewProjection = view.getProjection();
var viewResolution = view.getResolution();

var SchoolSource = new TileLayer({
  extent: [36.70170233932109, -1.0942626313459929, 37.41451596564397, -0.567184137048762],
  source: new TileWMS({
    url: 'http://yourlink:8080/geoserver/wms',
    params: {
      'LAYERS': ['MurangaSch:Schools_Affected'],
      'TILED': true
    },
    crossOrigin: 'Anonymous'
  })
})// define wms layer
var wmsSource = new TileLayer({
  extent: [36.70170233932109, -1.0942626313459929, 37.41451596564397, -0.567184137048762],
  source: new TileWMS({
    url: 'http://yourlink:8080/geoserver/wms',
    params: {
      'LAYERS': ['MurangaSch:Muranga', 'MurangaSch:buffer', 'MurangaSch:muranga_rivers'],
      'TILED': true
    },
    crossOrigin: 'Anonymous'
  })
})
/**
       * Create an overlay to anchor the popup to the map.
       */
var overlay = new Overlay({
  element: container,
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
});


/**
 * Add a click handler to hide the popup.
 *  Don't follow the href.
 */
closer.onclick = function () {
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};

// define map
const map = new Map({
  controls: defaultControls().extend([
    new ScaleLine({
      units: 'degrees'
    }),
    new ZoomSlider(),
    new ZoomToExtent({
      extent: [
        36.70170233932109, -1.0942626313459929, 37.41451596564397, -0.567184137048762
      ]
    })
  ]),
  target: 'map',
  overlays: [overlay],
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    wmsSource,
    SchoolSource,
    vector
  ],
  view: view
})


// show popup
map.on('click', function (evt) {
  var viewResolution = /** @type {number} */ (view.getResolution());
  var coordinate = evt.coordinate;
  var url = SchoolSource.getSource().getGetFeatureInfoUrl(
    evt.coordinate, viewResolution, 'EPSG:4326',
    { 'INFO_FORMAT': 'application/json' });
  if (url) {
    // fetch school feature info
    fetch(url).then(res => res.json()).then(json => {
      if(json.features.length){
        var feature = json.features[0];
        var props = feature.properties;
        var info = "<h5 class='panel-heading'>" + props["Name of Sc"] + "</h5><p><b>District:</b>" + props.District + "</p>"+'<p><b>Address:</b>' + props["School Add"] +"</p>" + '<p><b>Enrollment:</b>' + props["Total Enro"] +"</p>" ;
        content.innerHTML = info
        content.style.display = "block";
  
        content.classList.toggle("show");
        overlay.setPosition(coordinate)

      }
      else{
        overlay.setPosition(undefined)
      }   
    })
  }
});

map.on('pointermove', function (evt) {
  if (evt.dragging) {
    return;
  }
  var pixel = map.getEventPixel(evt.originalEvent);
  var hit = map.forEachLayerAtPixel(pixel, function () {
    return true;
  });
  map.getTargetElement().style.cursor = hit ? 'pointer' : '';
});
// // When the user clicks on <span> (x), close the modal
// span.onclick = function () {
//   content.style.display = "none";
// }

// When the user clicks anywhere outside of the modal, close it
// window.onclick = function (event) {
//   if (event.target == container) {
//     container.style.display = "none";
//   }
// }

// request for WfS Layer
var featureRequest = new WFS().writeGetFeature({
  srsName: 'EPSG:4326',
  featurePrefix: 'MurangaSch',
  maxfeatures: 20,
  featureTypes: ['Schools_Affected'],
  outputFormat: 'application/json',
})

// then post the request and add the received features to a layer
fetch('http://yourlink:8080/geoserver/wfs', {
  method: 'POST',
  body: new XMLSerializer().serializeToString(featureRequest)
}).then(function (response) {
  return response.json();
}).then(function (json) {
  var feature = json.features;
  // loop through feature array and move it to another list ie schList
  var schList = feature.map(function (sch) {
    return sch.properties["Name of Sc"]
  })
  // loop through schList and populate sideba
  var str = '<table>'
  schList.forEach(function (item) {
    str += '<tr><td class="list-group-item list-group-item-warning">' + item + '</td></tr>'
  })
  str += '</table>'
  sidebar.innerHTML = '<h4 class="content-link">Schools</h4>'+ str
  console.log(schList)
  var features = new GeoJSON().readFeatures(json);
  vectorSource.addFeatures(features);
  map.getView().fit(vectorSource.getExtent());
});

$(document).ready(function () {

  $('.content-close-button').click(function () {
    $('.content-close-button').hide();
    $('.content').hide();
    $('.site-main').removeClass('has-content-open')

    // When the map is resized programmatically, window resize must be triggered so that the map renders in the newly allotted space.
    window.dispatchEvent(new Event('resize'));

  });

  $('.content-link').click(function () {
    $('.content-close-button').show();
    $('.content').show();
    $('.site-main').addClass('has-content-open')
    window.dispatchEvent(new Event('resize'));
  });

});

// print map or download map
document.getElementById('export-png').addEventListener('click', function() {
  map.once('rendercomplete', function(event) {
    var canvas = event.context.canvas;
    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(canvas.msToBlob(), 'map.png');
    } else {
      canvas.toBlob(function(blob) {
        saveAs(blob, 'map.png');
      });
    }
  });
  map.renderSync();
});

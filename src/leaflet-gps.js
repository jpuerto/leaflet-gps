
(function() {

  L.Control.Gps = L.Control.extend({
    includes: L.Mixin.Events,
    //
    //Managed Events:
    //	Event			Data passed			Description
    //
    //	gpslocated		{latlng, marker}	fired after gps marker is located
    //	gpsdisabled							fired after gps is disabled
    //
    //Methods exposed:
    //	Method 			Description
    //
    //  getLocation		return Latlng and marker of current position
    //  activate		active tracking on runtime
    //  deactivate		deactive tracking on runtime
    //
    options: {
      autoActive: false, //activate control at startup
      autoCenter: false, //move map when gps location change
      maxZoom: null, //max zoom for autoCenter
      marker: null, //L.Marker used for location, default use a L.CircleMarker
      textErr: null, //error message on alert notification
      callErr: null, //function that run on gps error activating
      radius: 2, //marker circle style
      style: {
        weight: 3,
        color: '#e03',
        fill: false},
      title: 'Center map on your location',
      position: 'bottomright',
      imgSourceInactive: 'images/gps-icon.svg',
      imgSourceActive: 'images/gps-icon-active.svg',
              //TODO add gpsLayer
              //TODO timeout autoCenter
    },
    initialize: function(options) {
      if (options && options.style)
        options.style = L.Util.extend({}, this.options.style, options.style);
      L.Util.setOptions(this, options);
      this._errorFunc = this.options.callErr || this.showAlert;
      this._isActive = false;//global state of gps
      this._firstMoved = false;//global state of gps
      this._currentLocation = null;	//store last location
    },
    onAdd: function(map) {

      this._map = map;

      var container = L.DomUtil.create('div', 'leaflet-control-gps');

      this._button = L.DomUtil.create('a', 'gps-button', container);
      this._button.href = '#';
      this._button.title = this.options.title;
      this._image = L.DomUtil.create('img', 'gps-button-image', this._button);
      this._image.src = this.options.imgSourceInactive;
      this._resizeIcon();
      L.DomEvent
              .on(this._map, 'resize', this._resizeIcon, this);
      L.DomEvent
              .on(this._button, 'click', L.DomEvent.stop, this)
              .on(this._button, 'click', this._switchGps, this);

      this._alert = L.DomUtil.create('div', 'gps-alert', container);
      this._alert.style.display = 'none';

      this._gpsMarker = this.options.marker ? this.options.marker : new L.CircleMarker([0, 0], this.options.style);
      this._updateRadius();

      this._map
              .on('locationfound', this._drawGps, this)
              .on('locationerror', this._errorGps, this)
              .on('zoomend', this._updateRadius, this );

      if (this.options.autoActive)
        this.activate();

      return container;
    },
    _resizeIcon: function () {
      var size = this._map.getSize(),
          min = size.x < size.y?size.x:size.y,
          targetSize = Math.round(min * 0.1);
      this._image.height = targetSize;
      this._image.width = targetSize;
      this._button.style.height = targetSize + 'px';
      this._button.style.width = targetSize + 'px';
    },
    _updateRadius: function (event) {
      var newZoom = this._map.getZoom(),
          scale = this._map.options.crs.scale(newZoom);
      this._gpsMarker.setRadius(this.options.radius * scale);
      this._gpsMarker.redraw();
    },
    onRemove: function(map) {
      this.deactivate();
    },
    _switchGps: function() {
      if (this._isActive)
        this.deactivate();
      else
        this.activate();
    },
    getLocation: function() {	//get last location
      return this._currentLocation;
    },
    activate: function() {
      this._isActive = true;
      this._map.addLayer(this._gpsMarker);
//      this._map.locate({
//        enableHighAccuracy: true,
//        watch: true,
//        //maximumAge:s
//        setView: false, //automatically sets the map view to the user location
//        maxZoom: this.options.maxZoom
//      });
    },
    deactivate: function() {
      this._isActive = false;
      this._firstMoved = false;
//      this._map.stopLocate();
      L.DomUtil.removeClass(this._button, 'active');
      this._map.removeLayer(this._gpsMarker);
      //this._gpsMarker.setLatLng([-90,0]);  //move to antarctica!
      //TODO make method .hide() using _icon.style.display = 'none'
      this.fire('gpsdisabled');
    },
    _drawGps: function(e) {
      //TODO use e.accuracy for gps circle radius/color
      this._currentLocation = e.latlng;

      this._gpsMarker.setLatLng(e.latlng);

      if (this._isActive && (!this._firstMoved || this.options.autoCenter))
        this._moveTo(e.latlng);
//    	if(this._gpsMarker.accuracyCircle)
//    		this._gpsMarker.accuracyCircle.setRadius((e.accuracy / 2).toFixed(0));

      this.fire('gpslocated', {latlng: e.latlng, marker: this._gpsMarker});

      this._image.src = this.options.imgSourceActive;
    },
    _moveTo: function(latlng) {
      this._firstMoved = true;
      if (this.options.maxZoom)
        this._map.setView(latlng, Math.min(this._map.getZoom(), this.options.maxZoom));
      else
        this._map.panTo(latlng);
    },
    _errorGps: function(e) {
      this.deactivate();
      this._errorFunc.call(this, this.options.textErr || e.message);
    },
    showAlert: function(text) {
      this._alert.style.display = 'block';
      this._alert.innerHTML = text;
      var that = this;
      clearTimeout(this.timerAlert);
      this.timerAlert = setTimeout(function() {
        that._alert.style.display = 'none';
      }, 2000);
    }
  });

  L.control.gps = function(options) {
    return new L.Control.Gps(options);
  };

}).call(this);

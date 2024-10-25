mapboxgl.accessToken = 'pk.eyJ1IjoiZ2F1cmF2bmciLCJhIjoiY20xdGx3ODhuMDNzNTJ0cHI2YWphY2p1ZCJ9.DCncOYgA91GXOkejz0CilQ'; // Replace with your actual token

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-74.5, 40],
    zoom: 9
});

map.addControl(new mapboxgl.NavigationControl());

let fromCoordinates, toCoordinates;
let markers = [];

document.getElementById('searchLocations').addEventListener('click', () => {
    const fromQuery = document.getElementById('fromLocation').value;
    const toQuery = document.getElementById('toLocation').value;

    markers.forEach(marker => marker.remove());
    markers = [];

    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fromQuery)}.json?access_token=${mapboxgl.accessToken}`)
        .then(response => response.json())
            .then(data => {
                if (data.features.length > 0) {
                    fromCoordinates = data.features[0].center;
                    map.flyTo({ center: fromCoordinates, zoom: 14 });
                    const fromMarker = new mapboxgl.Marker({ color: 'green' }).setLngLat(fromCoordinates).addTo(map);
                    markers.push(fromMarker);
                } else {
                    alert('No results found for the "From" location.');
                }
            })
            .catch(error => console.error('Error fetching "From" location:', error));

    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(toQuery)}.json?access_token=${mapboxgl.accessToken}`)
        .then(response => response.json())
            .then(data => {
                if (data.features.length > 0) {
                    toCoordinates = data.features[0].center;
                    map.flyTo({ center: toCoordinates, zoom: 14 });
                    const toMarker = new mapboxgl.Marker({ color: 'blue' }).setLngLat(toCoordinates).addTo(map);
                    markers.push(toMarker);
                } else {
                    alert('No results found for the "To" location.');
                }
            })
            .catch(error => console.error('Error fetching "To" location:', error));
});

document.getElementById('fetchNearby').addEventListener('click', () => {
    const category = document.getElementById('nearbyPlaces').value;
    const sortOption = document.getElementById('sortOptions').value;

    if (category) {
        fetchNearbyPlaces(category, sortOption);
    } else {
        alert('Please select a category.');
    }
});

function fetchNearbyPlaces(category, sortOption) {
    if (toCoordinates) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${category}.json?proximity=${toCoordinates.join(',')}&types=poi&limit=10&access_token=${mapboxgl.accessToken}`;

            fetch(url)
                .then(response => response.json())
                .then(placesData => {

                    markers.forEach(marker => marker.remove());
                    markers = [];

                    if (sortOption === "highest-rated") {
                        placesData.features.sort((a, b) => b.properties.rating - a.properties.rating);
                    }

                    const place = placesData.features[0];
                    if (place) {
                        const [placeLng, placeLat] = place.geometry.coordinates;
                        const markerElement = document.createElement('div');
                        markerElement.className = 'nearby-marker';
                        const marker = new mapboxgl.Marker({ color: 'red', element: markerElement })
                            .setLngLat([placeLng, placeLat])
                            .setPopup(new mapboxgl.Popup().setHTML(`<h3>${place.text}</h3><p>${place.place_name}</p>`))
                            .addTo(map);

                        marker.togglePopup();
                        markers.push(marker);
                    } else {
                        alert(`No results found for nearby ${ category }.`);
                    }
                })
                .catch(error => console.error(`Error fetching nearby ${ category }:`, error));
    } else {
        alert('Please search for the "To" location first.');
    }
}

document.getElementById('calculateDistance').addEventListener('click', () => {
    if (fromCoordinates && toCoordinates) {
        const from = turf.point(fromCoordinates);
        const to = turf.point(toCoordinates);
        const options = { units: 'kilometers' };
        const distance = turf.distance(from, to, options);
        alert(`Distance: ${ distance.toFixed(2) } km`);
    } else {
        alert('Please search both locations first.');
    }
});

document.getElementById('getRoute').addEventListener('click', () => {
    if (fromCoordinates && toCoordinates) {
        const mode = document.getElementById('transportMode').value;
        const url = `https://api.mapbox.com/directions/v5/mapbox/${mode}/${fromCoordinates.join(',')};${toCoordinates.join(',')}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

            fetch(url)
                .then(response => response.json())
                .then(data => {
                    if (data.routes && data.routes.length > 0) {
                        const route = data.routes[0].geometry;
                        const duration = data.routes[0].duration;
                        const minutes = Math.round(duration / 60);

                        alert(`Estimated travel time: ${ minutes } minutes`);

                        const geojson = {
                            type: 'FeatureCollection',
                            features: [{
                                type: 'Feature',
                                geometry: route
                            }]
                        };

                        if (map.getSource('route')) {
                            map.removeLayer('route');
                            map.removeSource('route');
                        }

                        map.addSource('route', {
                            type: 'geojson',
                            data: geojson
                        });

                        map.addLayer({
                            id: 'route',
                            type: 'line',
                            source: 'route',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round'
                            },
                            paint: {
                                'line-color': '#888',
                                'line-width': 8
                            }
                        });

                        map.fitBounds(turf.bbox(geojson), { padding: 20 });
                    } else {
                        alert('No route found!');
                    }
                })
                .catch(error => console.error('Error fetching route:', error));
    } else {
        alert('Please search both locations first.');
    }
});

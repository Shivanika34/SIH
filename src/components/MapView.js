import { useEffect } from "react";

export default function MapView() {
  useEffect(() => {
    const map = new window.google.maps.Map(document.getElementById("map"), {
      zoom: 14,
      center: { lat: 13.0827, lng: 80.2707 }
    });

    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    directionsService.route({
      origin: "Madurai, India",
      destination: "Chennai, India",
      travelMode: "DRIVING"
    }, (result, status) => {
      if (status === "OK") directionsRenderer.setDirections(result);
    });
  }, []);

  return <div id="map" style={{ height: "500px", width: "100%" }}></div>;
}

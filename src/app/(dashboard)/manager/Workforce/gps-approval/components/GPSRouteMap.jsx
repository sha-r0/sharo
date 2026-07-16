"use client";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polyline,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

const greenIcon = new L.Icon({
    iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

const redIcon = new L.Icon({
    iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

export default function GPSRouteMap({

    row,

}) {

    const validLocation = (location) =>
        Number.isFinite(Number(location?.latitude ?? location?.lat)) &&
        Number.isFinite(Number(location?.longitude ?? location?.lng));

    const coordinates = (location) => [
        Number(location?.latitude ?? location?.lat),
        Number(location?.longitude ?? location?.lng),
    ];

    if (
        !validLocation(row.checkInLocation) &&
        !validLocation(row.checkOutLocation)
    ) {

        return (

            <div className="flex h-[450px] items-center justify-center rounded-2xl border-2 border-dashed">

                No GPS Available

            </div>

        );

    }

    const points = [];

    if (validLocation(row.checkInLocation)) {

        points.push(coordinates(row.checkInLocation));

    }

    if (validLocation(row.checkOutLocation)) {

        points.push(coordinates(row.checkOutLocation));

    }

    return (

        <MapContainer

            center={points[0]}

            zoom={15}

            style={{
                height: "450px",
                width: "100%",
                borderRadius: "18px",
            }}

        >

            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {

                validLocation(row.checkInLocation) &&

                <Marker

                    position={coordinates(row.checkInLocation)}

                    icon={greenIcon}

                >

                    <Popup>

                        <b>Check In</b>

                        <br />

                        {row.employeeName}

                    </Popup>

                </Marker>

            }

            {

                validLocation(row.checkOutLocation) &&

                <Marker

                    position={coordinates(row.checkOutLocation)}

                    icon={redIcon}

                >

                    <Popup>

                        <b>Check Out</b>

                        <br />

                        {row.employeeName}

                    </Popup>

                </Marker>

            }

            {

                points.length > 1 &&

                <Polyline

                    positions={points}

                />

            }

        </MapContainer>

    );

}

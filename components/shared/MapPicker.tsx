"use client"

/**
 * 点地图录经纬度。MVP:无搜索/反向地理编码,仅手动点击。
 *
 * Leaflet 在打包后默认 Marker 图标路径会失效,这里强制重新指定 CDN 图标。
 */
import "leaflet/dist/leaflet.css"

import L from "leaflet"
import { useEffect } from "react"
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet"

// 修 Leaflet Webpack 打包后 marker 图标 404 的老 bug
const DEFAULT_ICON = L.icon({
  iconRetinaUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function RecenterTo({
  lat,
  lng,
}: {
  lat: number | null
  lng: number | null
}) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], Math.max(map.getZoom(), 14))
    }
  }, [lat, lng, map])
  return null
}

type Props = {
  value: { lat: number; lng: number } | null
  onChange: (next: { lat: number; lng: number }) => void
  className?: string
}

export default function MapPicker({ value, onChange, className }: Props) {
  const center: [number, number] =
    value ? [value.lat, value.lng] : [31.2304, 121.4737] // 默认上海人民广场

  return (
    <div
      className={
        "border-input overflow-hidden rounded-md border " +
        (className ?? "h-[300px] w-full")
      }
    >
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler
          onPick={(lat, lng) => onChange({ lat, lng })}
        />
        {value ? (
          <Marker position={[value.lat, value.lng]} icon={DEFAULT_ICON} />
        ) : null}
        <RecenterTo lat={value?.lat ?? null} lng={value?.lng ?? null} />
      </MapContainer>
    </div>
  )
}

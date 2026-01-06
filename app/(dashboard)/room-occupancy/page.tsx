/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface Property {
  _id: string;
  name: string;
}
interface Room {
  _id: string;
  roomNo: string;
}
interface Booking {
  _id: string;
  guestName: string;
  roomId?: string;
  propertyId?: { _id: string; name: string };
  checkInDate: string;
  checkOutDate: string;
  status: string;
  type?: "checkin" | "checkout" | "stay";
}

export default function RoomOccupancyPage() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [propertyId, setPropertyId] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);

  // Properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: () => fetch("/api/properties").then((res) => res.json()),
  });

  // Rooms
  const { data: rooms = [], isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ["rooms", propertyId],
    enabled: !!propertyId,
    queryFn: () =>
      fetch(`/api/rooms?propertyId=${propertyId}`).then((res) => res.json()),
  });

  // Bookings for occupancy
  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["occupancies", propertyId, selectedDate],
    enabled: !!propertyId,
    queryFn: () =>
      fetch(`/api/bookings?propertyId=${propertyId}&date=${selectedDate}`).then(
        (res) => res.json()
      ),
  });

  // **Unassigned guests: all properties**
  const { data: unassigned = [] } = useQuery<Booking[]>({
    queryKey: ["unassignedBookings"],
    queryFn: () =>
      fetch(`/api/bookings?unassigned=true`).then((res) => res.json()),
  });

  // Mutations
  const bookingMutation = useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["occupancies"] });
      queryClient.invalidateQueries({ queryKey: ["unassignedBookings"] });
    },
  });

  const bookingsForRoom = (roomId: string) =>
    bookings.filter((b) => b.roomId === roomId);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">🏨 Room Occupancy</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          className="border rounded px-4 py-2 shadow"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
        >
          <option value="">Select Property</option>
          {properties.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded px-4 py-2 shadow"
        />
      </div>

      {roomsLoading && <p>Loading rooms...</p>}

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rooms.map((room) => {
          const roomBookings = bookingsForRoom(room._id);
          const isOccupied = roomBookings.length > 0;

          return (
            <div
              key={room._id}
              className={`rounded-xl shadow-md p-5 ${
                isOccupied ? "bg-red-50" : "bg-green-50"
              }`}
            >
              <div className="flex justify-between mb-2">
                <h2 className="text-xl font-semibold">Room {room.roomNo}</h2>
                <span
                  className={`text-xs px-3 py-1 rounded-full ${
                    isOccupied ? "bg-red-200" : "bg-green-200"
                  }`}
                >
                  {isOccupied ? "Occupied" : "Available"}
                </span>
              </div>

              {roomBookings.map((b) => (
                <div
                  key={b._id}
                  className="mb-3 p-2 rounded border border-gray-200 bg-white shadow-sm"
                >
                  <p className="font-medium">👤 {b.guestName}</p>
                  <p className="text-sm text-gray-600">
                    📅 {b.checkInDate.slice(0, 10)} →{" "}
                    {b.checkOutDate.slice(0, 10)}
                  </p>

                  <div className="flex gap-2 mt-2">
                    {b.type === "checkin" && b.status === "booked" && (
                      <button
                        onClick={() =>
                          bookingMutation.mutate({
                            bookingId: b._id,
                            action: "checkin",
                          })
                        }
                        className="bg-blue-500 text-white px-3 py-1 rounded"
                      >
                        Check-in
                      </button>
                    )}
                    {b.type === "checkout" && (
                      <button
                        onClick={() =>
                          bookingMutation.mutate({
                            bookingId: b._id,
                            action: "checkout",
                          })
                        }
                        className="bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Check-out
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Unassigned Guests (all properties) */}
              {!isOccupied && (
                <select
                  className="border rounded w-full mt-3 p-2"
                  onChange={(e) =>
                    bookingMutation.mutate({
                      action: "assign",
                      roomId: room._id,
                      bookingId: e.target.value,
                    })
                  }
                >
                  <option value="">Assign Guest</option>
                  {unassigned.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.guestName} ({b.propertyId?.name || "No Property"})
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

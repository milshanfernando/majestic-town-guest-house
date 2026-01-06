/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

/* ===================== TYPES ===================== */
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
  status: "booked" | "checked_in" | "checked_out" | "cancel";
}

/* ===================== PAGE ===================== */
export default function RoomOccupancyPage() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [propertyId, setPropertyId] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);

  /* ---------------- Properties ---------------- */
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: () => fetch("/api/properties").then((res) => res.json()),
  });

  /* ---------------- Rooms ---------------- */
  const { data: rooms = [], isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ["rooms", propertyId],
    enabled: !!propertyId,
    queryFn: () =>
      fetch(`/api/rooms?propertyId=${propertyId}`).then((res) => res.json()),
  });

  /* ---------------- Occupied Rooms (by date) ---------------- */
  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["occupancies", propertyId, selectedDate],
    enabled: !!propertyId,
    queryFn: () =>
      fetch(`/api/bookings?propertyId=${propertyId}&date=${selectedDate}`).then(
        (res) => res.json()
      ),
  });

  /* ---------------- Unassigned Bookings ---------------- */
  const { data: unassigned = [] } = useQuery<Booking[]>({
    queryKey: ["unassignedBookings", propertyId],
    enabled: !!propertyId,
    queryFn: () =>
      fetch(`/api/bookings?unassigned=true&propertyId=${propertyId}`).then(
        (res) => res.json()
      ),
  });

  /* ===================== MUTATIONS ===================== */
  const roomMutation = useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["occupancies"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["unassignedBookings"] });
    },
  });

  /* ===================== HELPERS ===================== */
  const bookingsForRoom = (roomId: string) =>
    bookings.filter((b) => b.roomId === roomId);

  const getBookingType = (booking: Booking) => {
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    const checkIn = new Date(booking.checkInDate);
    checkIn.setHours(0, 0, 0, 0);

    const checkOut = new Date(booking.checkOutDate);
    checkOut.setHours(0, 0, 0, 0);

    if (checkIn.getTime() === selected.getTime()) return "checkin";
    if (checkOut.getTime() === selected.getTime()) return "checkout";
    return "stay";
  };

  /* ===================== UI ===================== */
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">🏨 Room Occupancy</h1>

      {/* ---------------- Filters ---------------- */}
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

      {/* ---------------- Rooms Grid ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rooms.map((room) => {
          const roomBookings = bookingsForRoom(room._id);

          return (
            <div
              key={room._id}
              className={`rounded-xl shadow-md p-5 ${
                roomBookings.length ? "bg-red-50" : "bg-green-50"
              }`}
            >
              <div className="flex justify-between mb-2">
                <h2 className="text-xl font-semibold">Room {room.roomNo}</h2>
                <span
                  className={`text-xs px-3 py-1 rounded-full ${
                    roomBookings.length ? "bg-red-200" : "bg-green-200"
                  }`}
                >
                  {roomBookings.length ? "Occupied" : "Available"}
                </span>
              </div>

              {roomBookings.length === 0 ? (
                <select
                  className="border rounded w-full mt-3 p-2"
                  onChange={(e) =>
                    roomMutation.mutate({
                      action: "assign",
                      roomId: room._id,
                      bookingId: e.target.value,
                    })
                  }
                >
                  <option value="">Assign Guest</option>
                  {unassigned.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.guestName}
                    </option>
                  ))}
                </select>
              ) : (
                roomBookings.map((booking) => {
                  const type = getBookingType(booking);
                  return (
                    <div
                      key={booking._id}
                      className="mt-3 p-3 rounded bg-white shadow"
                    >
                      <p className="font-medium">👤 {booking.guestName}</p>

                      {type === "checkout" && (
                        <>
                          <span className="text-xs bg-yellow-200 px-2 py-1 rounded">
                            Checkout Today
                          </span>
                          <button
                            onClick={() =>
                              roomMutation.mutate({
                                action: "checkout",
                                bookingId: booking._id,
                              })
                            }
                            className="block mt-2 bg-red-600 text-white px-3 py-1 rounded"
                          >
                            Checkout
                          </button>
                        </>
                      )}

                      {type === "checkin" && (
                        <>
                          <span className="text-xs bg-blue-200 px-2 py-1 rounded">
                            Booked (Check-in Today)
                          </span>
                          <button
                            onClick={() =>
                              roomMutation.mutate({
                                action: "checkin",
                                bookingId: booking._id,
                              })
                            }
                            className="block mt-2 bg-green-600 text-white px-3 py-1 rounded"
                          >
                            Check-in
                          </button>
                        </>
                      )}

                      {type === "stay" && (
                        <span className="text-xs bg-red-200 px-2 py-1 rounded">
                          Occupied
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

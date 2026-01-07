/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

/* ================= TYPES ================= */

interface Property {
  _id: string;
  name: string;
}

interface BookingForm {
  guestName: string;
  phone: string;
  email: string;
  reservationId: string;
  propertyId: string;
  platform: string;
  paymentMethod: string;
  amount: number | "";
  paymentDate: string | "";
  checkInDate: string | "";
  checkOutDate: string | "";
  status: string;
}

/* ================= API ================= */

const fetchJSON = (url: string) => fetch(url).then((r) => r.json());

const formatRange = (inDate: string, outDate: string) => {
  if (!inDate || !outDate) return "";
  return `${new Date(inDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} → ${new Date(outDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
};

export default function BookingPage() {
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);

  const [form, setForm] = useState<BookingForm>({
    guestName: "",
    phone: "",
    email: "",
    reservationId: "",
    propertyId: "",
    platform: "Booking.com",
    paymentMethod: "online",
    amount: "",
    paymentDate: "",
    checkInDate: "",
    checkOutDate: "",
    status: "booked",
  });

  /* ================= QUERIES ================= */

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: () => fetchJSON("/api/properties"),
  });

  const { data: occupancies = [] } = useQuery<any[]>({
    queryKey: ["occupancies", selectedDate],
    queryFn: () => fetchJSON(`/api/bookings?date=${selectedDate}`),
  });

  /* ================= MUTATIONS ================= */

  const saveBooking = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });
      if (!res.ok) throw new Error("Failed to save booking");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["occupancies"] });
    },
  });

  const removeFromRoom = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: "", // ✅ ONLY CLEAR ROOM
        }),
      });
      if (!res.ok) throw new Error("Failed to remove from room");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["occupancies"] });
    },
  });

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">🏨 Booking Management</h1>

      {/* ================= SELECT GUEST ================= */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 max-w-xl">
        <h2 className="font-semibold mb-3">👤 Select Existing Guest</h2>

        <select
          className="border p-2 rounded w-full bg-white"
          onChange={(e) => {
            const booking = occupancies.find((b) => b._id === e.target.value);
            if (!booking) return;

            setForm({
              ...form,
              guestName: booking.guestName,
              reservationId: booking.reservationId || "",
              checkInDate: booking.checkInDate?.slice(0, 10),
              checkOutDate: booking.checkOutDate?.slice(0, 10),
              propertyId: booking.propertyId?._id || "",
            });
          }}
        >
          <option value="">Select Guest</option>
          {occupancies.map((b) => (
            <option key={b._id} value={b._id}>
              {b.guestName} ({formatRange(b.checkInDate, b.checkOutDate)})
            </option>
          ))}
        </select>

        {form.checkInDate && (
          <p className="text-sm text-gray-600 mt-2">
            📅 {formatRange(form.checkInDate, form.checkOutDate)}
          </p>
        )}
      </div>

      {/* ================= DATE SELECT ================= */}
      <div className="flex items-center gap-3 mb-4">
        <label className="font-medium">📅 Select Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border p-2 rounded bg-white"
        />
      </div>

      {/* ================= OCCUPANCY ================= */}
      <h2 className="text-xl font-semibold mb-4">
        🏠 Occupancy – {selectedDate}
      </h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {occupancies.length === 0 && (
          <p className="text-gray-500">No occupied rooms</p>
        )}

        {occupancies.map((b) => (
          <div key={b._id} className="bg-white shadow rounded-lg p-4 space-y-1">
            <p className="font-semibold">{b.guestName}</p>
            <p className="text-sm">
              {formatRange(b.checkInDate, b.checkOutDate)}
            </p>
            <p className="text-xs text-gray-500">
              💰 {b.amount} ({b.paymentMethod})
            </p>

            <button
              onClick={() => removeFromRoom.mutate(b._id)}
              className="mt-3 text-xs text-red-600 border border-red-300 px-3 py-1 rounded hover:bg-red-50"
            >
              Remove from Room
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

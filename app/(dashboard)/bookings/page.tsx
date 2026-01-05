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
  propertyId: string;
  platform: string;
  paymentMethod: string;
  amount: number | "";
  paymentDate: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
}

/* ================= API ================= */

const fetchJSON = (url: string) => fetch(url).then((r) => r.json());

export default function BookingPage() {
  const qc = useQueryClient();

  /* ================= STATE ================= */

  const [form, setForm] = useState<BookingForm>({
    guestName: "",
    phone: "",
    email: "",
    propertyId: "",
    platform: "Booking.com",
    paymentMethod: "online",
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    checkInDate: "",
    checkOutDate: "",
    status: "booked",
  });

  /* ================= QUERIES ================= */

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: () => fetchJSON("/api/properties"),
  });

  const { data: todayBookings = [] } = useQuery<any[]>({
    queryKey: ["today-bookings"],
    queryFn: () => fetchJSON("/api/bookings?today=true"),
  });

  /* ================= MUTATION ================= */

  const saveBooking = useMutation({
    mutationFn: () =>
      fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["today-bookings"] });

      // reset
      setForm({
        guestName: "",
        phone: "",
        email: "",
        propertyId: "",
        platform: "Booking.com",
        paymentMethod: "online",
        amount: "",
        paymentDate: new Date().toISOString().slice(0, 10),
        checkInDate: "",
        checkOutDate: "",
        status: "booked",
      });
    },
  });

  /* ================= HANDLERS ================= */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ================= UI ================= */

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">📝 New Booking</h1>

      <div className="bg-white rounded-xl shadow p-6 max-w-xl">
        <div className="grid grid-cols-2 gap-3">
          <input
            name="guestName"
            placeholder="Guest Name"
            className="border p-2 rounded"
            value={form.guestName}
            onChange={handleChange}
          />

          <input
            name="phone"
            placeholder="Phone"
            className="border p-2 rounded"
            value={form.phone}
            onChange={handleChange}
          />

          <input
            name="email"
            placeholder="Email"
            className="border p-2 rounded col-span-2"
            value={form.email}
            onChange={handleChange}
          />

          <select
            name="propertyId"
            className="border p-2 rounded col-span-2"
            value={form.propertyId}
            onChange={handleChange}
          >
            <option value="">Select Property</option>
            {properties.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            name="platform"
            className="border p-2 rounded"
            value={form.platform}
            onChange={handleChange}
          >
            <option>Booking.com</option>
            <option>Agoda</option>
            <option>Airbnb</option>
            <option>Expedia</option>
            <option>Direct</option>
          </select>

          <select
            name="paymentMethod"
            className="border p-2 rounded"
            value={form.paymentMethod}
            onChange={handleChange}
          >
            <option value="online">Online</option>
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
          </select>

          <input
            name="amount"
            type="number"
            placeholder="Amount"
            className="border p-2 rounded"
            value={form.amount}
            onChange={handleChange}
          />

          <input
            name="paymentDate"
            type="date"
            className="border p-2 rounded"
            value={form.paymentDate}
            onChange={handleChange}
          />

          <input
            name="checkInDate"
            type="date"
            className="border p-2 rounded"
            value={form.checkInDate}
            onChange={handleChange}
          />

          <input
            name="checkOutDate"
            type="date"
            className="border p-2 rounded col-span-2"
            value={form.checkOutDate}
            onChange={handleChange}
          />
        </div>

        <button
          onClick={() => saveBooking.mutate()}
          className="mt-4 bg-black hover:bg-gray-800 text-white px-6 py-2 rounded w-full"
        >
          Save Booking
        </button>
      </div>

      {/* ================= TODAY BOOKINGS ================= */}
      <h2 className="text-2xl font-semibold mt-10 mb-4">📅 Today’s Bookings</h2>

      <div className="grid md:grid-cols-3 gap-4">
        {todayBookings.map((b) => (
          <div key={b._id} className="bg-white shadow rounded p-4">
            <p className="font-semibold">{b.guestName}</p>
            <p className="text-sm">🏠 {b.propertyId?.name}</p>
            <p className="text-sm">
              💰 {b.amount} ({b.paymentMethod})
            </p>
            <p className="text-xs text-gray-500">
              💳 Paid: {b.paymentDate?.slice(0, 10)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

/* ================= TYPES ================= */

interface Property {
  _id: string;
  name: string;
}

interface ImportedBooking {
  reservationId: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  unitType: string;
  propertyId: string;
  paymentMethod: "online" | "bank" | "cash";
  status?: "pending" | "saved";
}

/* ================= API ================= */

const fetchJSON = (url: string) => fetch(url).then((r) => r.json());

/* ================= PAGE ================= */

export default function BulkBookingPage() {
  const qc = useQueryClient();
  const [rows, setRows] = useState<ImportedBooking[]>([]);

  /* ================= QUERIES ================= */

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: () => fetchJSON("/api/properties"),
  });

  /* ================= EXCEL UPLOAD ================= */

  const handleExcelUpload = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const json = XLSX.utils.sheet_to_json<any>(sheet);

      const parsed: ImportedBooking[] = json.map((r) => ({
        reservationId: String(
          r.bookNumber || r.reservationId || r["Reservation number"] || ""
        ),
        guestName: r.guestName || r.bookedBy || r["Booked by"] || "Unknown",
        checkInDate: r.checkInDate || r["Check-in"] || r["Check in"] || "",
        checkOutDate: r.checkOutDate || r["Check-out"] || r["Check out"] || "",
        unitType: r.unitType || r.roomType || r["Unit type"] || "",
        propertyId: "",
        paymentMethod: "online",
        status: "pending",
      }));

      setRows(parsed);
    };

    reader.readAsBinaryString(file);
  };

  /* ================= SAVE MUTATION ================= */

  const saveBooking = useMutation({
    mutationFn: async (row: ImportedBooking) => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: row.reservationId,
          guestName: row.guestName,
          checkInDate: row.checkInDate,
          checkOutDate: row.checkOutDate,
          unitType: row.unitType,
          propertyId: row.propertyId,
          paymentMethod: row.paymentMethod,
          platform: "Booking.com",
          status: "booked",
        }),
      });

      if (!res.ok) throw new Error("Failed to save booking");
      return res.json();
    },
    onSuccess: (_, row) => {
      setRows((prev) =>
        prev.map((r) =>
          r.reservationId === row.reservationId ? { ...r, status: "saved" } : r
        )
      );
      qc.invalidateQueries({ queryKey: ["occupancies"] });
    },
  });

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">📥 Bulk Booking Import</h1>

      {/* ================= BOOKING.COM ================= */}
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Booking.com</h2>

        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={(e) =>
            e.target.files && handleExcelUpload(e.target.files[0])
          }
          className="mb-4"
        />

        {rows.length === 0 && (
          <p className="text-gray-500 text-sm">
            Upload a Booking.com Excel (.xls / .xlsx) file
          </p>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border p-2">Reservation ID</th>
                  <th className="border p-2">Guest Name</th>
                  <th className="border p-2">Check-In</th>
                  <th className="border p-2">Check-Out</th>
                  <th className="border p-2">Unit Type</th>
                  <th className="border p-2">Property</th>
                  <th className="border p-2">Payment</th>
                  <th className="border p-2">Status</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr key={r.reservationId} className="text-center">
                    <td className="border p-2">{r.reservationId}</td>
                    <td className="border p-2">{r.guestName}</td>
                    <td className="border p-2">{r.checkInDate}</td>
                    <td className="border p-2">{r.checkOutDate}</td>
                    <td className="border p-2">{r.unitType}</td>

                    <td className="border p-2">
                      <select
                        className="border rounded p-1 w-full"
                        value={r.propertyId}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.reservationId === r.reservationId
                                ? { ...x, propertyId: e.target.value }
                                : x
                            )
                          )
                        }
                      >
                        <option value="">Select Property</option>
                        {properties.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="border p-2">
                      <select
                        className="border rounded p-1 w-full"
                        value={r.paymentMethod}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) =>
                              x.reservationId === r.reservationId
                                ? {
                                    ...x,
                                    paymentMethod: e.target
                                      .value as ImportedBooking["paymentMethod"],
                                  }
                                : x
                            )
                          )
                        }
                      >
                        <option value="online">Online</option>
                        <option value="bank">Bank</option>
                        <option value="cash">Cash</option>
                      </select>
                    </td>

                    <td className="border p-2">
                      {r.status === "saved" ? (
                        <span className="text-green-600 font-medium">
                          ✔ Saved
                        </span>
                      ) : (
                        <button
                          disabled={!r.propertyId}
                          onClick={() => saveBooking.mutate(r)}
                          className="bg-black text-white px-3 py-1 rounded text-xs disabled:opacity-50"
                        >
                          Save
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";

/* ======================================================
   GET BOOKINGS
   - ?date=YYYY-MM-DD  → occupancy for selected date
   - ?propertyId=xxx
   - Returns bookings with "type": "checkin" | "checkout" | "stay"
====================================================== */
export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const dateParam =
      searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const propertyId = searchParams.get("propertyId");
    const unassigned = searchParams.get("unassigned");

    const query: any = {};

    if (propertyId) {
      query.propertyId = propertyId;
    }

    // Only unassigned bookings
    if (unassigned === "true") {
      query.roomId = { $exists: false };
      query.status = { $ne: "cancel" };

      const unassignedBookings = await Booking.find(query)
        .populate("propertyId")
        .sort({ checkInDate: 1 });

      return NextResponse.json(unassignedBookings);
    }

    // Filter by selected date
    if (dateParam) {
      const selected = new Date(dateParam);
      selected.setHours(0, 0, 0, 0);

      const startOfDay = new Date(selected);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selected);
      endOfDay.setHours(23, 59, 59, 999);

      query.checkInDate = { $lte: endOfDay };
      query.checkOutDate = { $gte: startOfDay };
      query.status = { $ne: "cancel" };
    }

    const bookings = await Booking.find(query)
      .populate("propertyId")
      .sort({ checkInDate: 1 });

    // Add type for frontend convenience
    const bookingsWithType = bookings.map((b: any) => {
      const checkIn = new Date(b.checkInDate);
      const checkOut = new Date(b.checkOutDate);

      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);

      const selected = new Date(dateParam);
      selected.setHours(0, 0, 0, 0);

      let type: "checkin" | "checkout" | "stay" = "stay";
      if (checkIn.getTime() === selected.getTime()) type = "checkin";
      else if (checkOut.getTime() === selected.getTime()) type = "checkout";

      return {
        ...b.toObject(),
        type,
      };
    });

    return NextResponse.json(bookingsWithType);
  } catch (error) {
    console.error("BOOKING GET ERROR:", error);
    return NextResponse.json([], { status: 500 });
  }
}

/* ======================================================
   CREATE BOOKING
====================================================== */
export async function POST(req: Request) {
  try {
    await connectDB();
    const data = await req.json();

    const booking = await Booking.create({
      ...data,
      status: data.status || "booked",
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error("BOOKING POST ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}

/* ======================================================
   UPDATE / ASSIGN / CHECKIN / CHECKOUT
====================================================== */
export async function PATCH(req: Request) {
  try {
    await connectDB();
    const { bookingId, action, roomId } = await req.json();

    if (!bookingId && !roomId) {
      return NextResponse.json(
        { error: "bookingId or roomId required" },
        { status: 400 }
      );
    }

    let booking;

    if (action === "assign") {
      booking = await Booking.findByIdAndUpdate(
        bookingId,
        { roomId },
        { new: true }
      );
    }

    if (action === "checkin") {
      booking = await Booking.findByIdAndUpdate(
        bookingId,
        { status: "checked_in" },
        { new: true }
      );
    }

    if (action === "checkout") {
      booking = await Booking.findByIdAndUpdate(
        bookingId,
        { status: "checked_out" },
        { new: true }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("BOOKING PATCH ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}

/* ======================================================
   CANCEL BOOKING (soft delete)
====================================================== */
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "bookingId required" },
        { status: 400 }
      );
    }

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: "cancel" },
      { new: true }
    );

    return NextResponse.json(booking);
  } catch (error) {
    console.error("BOOKING DELETE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}

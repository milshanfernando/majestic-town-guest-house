/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";

/* ======================================================
   GET BOOKINGS
   Supports:
   - all bookings
   - ?date=YYYY-MM-DD
   - ?propertyId=xxx
   - ?active=true   (today's checked-in guests)
====================================================== */
export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const propertyId = searchParams.get("propertyId");
    const active = searchParams.get("active");

    const query: any = {};

    // Filter by property
    if (propertyId) {
      query.propertyId = propertyId;
    }

    // Filter by check-in date (daily income)
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);

      query.checkInDate = { $gte: start, $lt: end };
    }

    // Active guests (room occupancy)
    if (active === "true") {
      const today = new Date();
      query.checkInDate = { $lte: today };
      query.checkOutDate = { $gt: today };
      query.status = "checkin";
    }

    const bookings = await Booking.find(query)
      .populate("propertyId")
      .populate("roomId")
      .sort({ createdAt: -1 });

    return NextResponse.json(bookings);
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
   UPDATE BOOKING
   Uses:
   - status change
   - edit guest details
====================================================== */
export async function PATCH(req: Request) {
  try {
    await connectDB();

    const { bookingId, updates } = await req.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "bookingId required" },
        { status: 400 }
      );
    }

    const booking = await Booking.findByIdAndUpdate(bookingId, updates, {
      new: true,
    });

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
   DELETE / CANCEL BOOKING
   (soft delete using status = cancel)
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
      { status: "cancel", roomId: null },
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

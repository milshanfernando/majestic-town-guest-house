/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Booking from "@/models/Booking";

/* ======================================================
   GET BOOKINGS
   - ?date=YYYY-MM-DD  → occupancy for selected date
   - ?propertyId=xxx
====================================================== */
export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const propertyId = searchParams.get("propertyId");

    const query: any = {};

    if (propertyId) {
      query.propertyId = propertyId;
    }

    // OCCUPANCY LOGIC
    if (date) {
      const selected = new Date(date);

      query.checkInDate = { $lte: selected };
      query.checkOutDate = { $gte: selected };
      query.status = { $ne: "cancel" };
    }

    const bookings = await Booking.find(query)
      .populate("propertyId")
      .sort({ checkInDate: 1 });

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

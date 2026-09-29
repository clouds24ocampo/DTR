import { Request, Response } from "express";
import EventModel from "../../../models/event.model";

interface AuthenticatedRequest extends Request {
  user?: { id: string; position: string };
}

// Operations Manager Can Create an Event
export const createEvent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.position !== "Operations Manager") {
      res.status(403).json({
        message: "Forbidden: Only Operations Manager can create events",
      });
      return;
    }

    const { date, time, title, details, status } = req.body;

    // Assign Color Based on Status
    let color = "yellow"; // Default Pending
    if (status === "Confirmed") color = "blue";
    if (status === "Completed") color = "green";
    if (status === "Canceled") color = "red";

    const event = await EventModel.create({
      date,
      time,
      title,
      details,
      status,
      color,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: "Event created successfully", event });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

// Get All Events (All Users Can View)
export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await EventModel.find().populate(
      "createdBy",
      "firstName lastName position"
    );
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

// Operations Manager Can Edit an Event
export const editEvent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.position !== "Operations Manager") {
      res.status(403).json({
        message: "Forbidden: Only Operations Manager can edit events",
      });
      return;
    }

    const { eventId } = req.params;
    const { date, time, title, details, status } = req.body;

    // Assign Color Based on Status
    let color = "yellow";
    if (status === "Confirmed") color = "blue";
    if (status === "Completed") color = "green";
    if (status === "Canceled") color = "red";

    const updatedEvent = await EventModel.findByIdAndUpdate(
      eventId,
      { date, time, title, details, status, color },
      { new: true }
    );

    if (!updatedEvent) {
      res.status(404).json({ message: "Event not found." });
      return;
    }

    res
      .status(200)
      .json({ message: "Event updated successfully", event: updatedEvent });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

// Operations Manager Can Delete an Event
export const deleteEvent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.position !== "Operations Manager") {
      res.status(403).json({
        message: "Forbidden: Only Operations Manager can delete events",
      });
      return;
    }

    const { eventId } = req.params;
    const deletedEvent = await EventModel.findByIdAndDelete(eventId);

    if (!deletedEvent) {
      res.status(404).json({ message: "Event not found." });
      return;
    }

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

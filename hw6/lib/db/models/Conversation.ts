import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IConversation extends Document {
  userId: Types.ObjectId;
  status: "active" | "completed" | "archived";
  category?: string;
  metadata: {
    ip?: string;
    mac?: string;
    room?: string;
    [key: string]: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
      index: true,
    },
    category: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);

export default Conversation;



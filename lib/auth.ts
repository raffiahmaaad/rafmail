import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { db } from "./db";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import { sendWelcomeEmail, sendAdminNewUserNotification } from "./email";

// Owner email that is always auto-approved
const OWNER_EMAIL = "raffi.ahmaaaddd@gmail.com";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  trustedOrigins: [
    "http://localhost:3000",
    "https://rafmail.web.id",
    process.env.BETTER_AUTH_URL || "",
  ].filter(Boolean),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Set approval status AFTER user is created
          // (before hook can't set custom fields that BetterAuth doesn't know about)
          const isOwner = user.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
          
          // Update the user with approval status
          await db
            .update(schema.user)
            .set({
              approvalStatus: isOwner ? "approved" : "pending",
              approvedAt: isOwner ? new Date() : null,
            })
            .where(eq(schema.user.id, user.id));

          // Send emails for new registrations (except owner)
          if (!isOwner) {
            // Send welcome email to user
            await sendWelcomeEmail(user);
            // Send notification to admin
            await sendAdminNewUserNotification(user);
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          // Check if user is approved before allowing session creation
          const userResult = await db
            .select({ approvalStatus: schema.user.approvalStatus })
            .from(schema.user)
            .where(eq(schema.user.id, session.userId))
            .limit(1);

          const userApprovalStatus = userResult[0]?.approvalStatus;

          if (userApprovalStatus === "pending") {
            throw new APIError("FORBIDDEN", {
              message: "PENDING_APPROVAL",
            });
          }

          if (userApprovalStatus === "rejected") {
            throw new APIError("FORBIDDEN", {
              message: "REGISTRATION_REJECTED",
            });
          }

          return { data: session };
        },
      },
    },
  },
});


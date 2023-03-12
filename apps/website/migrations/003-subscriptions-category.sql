ALTER TABLE "subscriptions" DROP COLUMN "type";
ALTER TABLE "subscriptions" ADD COLUMN "category" TEXT NOT NULL;

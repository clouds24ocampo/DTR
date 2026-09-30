import PerformanceReviewModel from "./performance.model";

describe("PerformanceReview Model", () => {
    describe("Schema Validation", () => {
        it("should create a valid performance review", () => {
            const validReview: any = {
                employee: "60d5f2f5f1b2c3a4b5c6d7e8", // Example ObjectId string
                employeeName: "John Doe",
                reviewer: "60d5f2f5f1b2c3a4b5c6d7e9",
                reviewerName: "Jane Manager",
                reviewPeriod: {
                    start: new Date("2024-01-01"),
                    end: new Date("2024-03-31"),
                    label: "Q1 2024",
                },
                kpis: [
                    {
                        name: "Sales Target",
                        description: "Achieve monthly sales quota",
                        targetValue: 100000,
                        actualValue: 105000,
                        weight: 40,
                        rating: 5,
                        comments: "Exceeded target by 5%",
                    },
                    {
                        name: "Customer Satisfaction",
                        description: "Maintain customer satisfaction above 90%",
                        targetValue: 90,
                        actualValue: 92,
                        weight: 30,
                        rating: 4,
                        comments: "Great customer feedback",
                    },
                ],
                overallScore: 85,
                overallRating: "exceeds",
                status: "draft",
            };

            const review = new PerformanceReviewModel(validReview);
            const validationError = review.validateSync();

            expect(validationError).toBeUndefined();
            expect(review.employeeName).toBe("John Doe");
            expect(review.status).toBe("draft");
        });

        it("should require essential fields", () => {
            const invalidReview = new PerformanceReviewModel({});
            const validationError = invalidReview.validateSync();

            expect(validationError).toBeDefined();
            expect(validationError?.errors.employee).toBeDefined();
            expect(validationError?.errors.employeeName).toBeDefined();
            expect(validationError?.errors.reviewer).toBeDefined();
            expect(validationError?.errors.reviewerName).toBeDefined();
        });

        it("should validate status enum", () => {
            const review = new PerformanceReviewModel({
                employee: "60d5f2f5f1b2c3a4b5c6d7e8",
                employeeName: "John Doe",
                reviewer: "60d5f2f5f1b2c3a4b5c6d7e9",
                reviewerName: "Jane Manager",
                reviewPeriod: {
                    start: new Date(),
                    end: new Date(),
                    label: "Q1 2024",
                },
                status: "invalid-status" as any,
            });

            const validationError = review.validateSync();
            expect(validationError).toBeDefined();
            expect(validationError?.errors.status).toBeDefined();
        });

        it("should validate KPI weight range", () => {
            const review = new PerformanceReviewModel({
                employee: "60d5f2f5f1b2c3a4b5c6d7e8",
                employeeName: "John Doe",
                reviewer: "60d5f2f5f1b2c3a4b5c6d7e9",
                reviewerName: "Jane Manager",
                reviewPeriod: {
                    start: new Date(),
                    end: new Date(),
                    label: "Q1 2024",
                },
                kpis: [
                    {
                        name: "Invalid KPI",
                        targetValue: 100,
                        weight: 150, // Invalid: exceeds max 100
                    },
                ],
                status: "draft",
            });

            const validationError = review.validateSync();
            expect(validationError).toBeDefined();
        });
    });

    describe("Default Values", () => {
        it("should default status to 'draft'", () => {
            const review = new PerformanceReviewModel({
                employee: "60d5f2f5f1b2c3a4b5c6d7e8",
                employeeName: "John Doe",
                reviewer: "60d5f2f5f1b2c3a4b5c6d7e9",
                reviewerName: "Jane Manager",
                reviewPeriod: {
                    start: new Date(),
                    end: new Date(),
                    label: "Q1 2024",
                },
            });

            expect(review.status).toBe("draft");
        });
    });
});

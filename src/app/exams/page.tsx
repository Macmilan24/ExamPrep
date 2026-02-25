import { createClient } from "@/lib/supabase/server";
import type { Exam } from "@/lib/supabase/types";
import { ExamCatalog } from "./exam-catalog";

export const revalidate = 60; // Revalidate every 60 seconds

export default async function ExamsPage() {
    let exams: Exam[] = [];
    let error: string | null = null;

    try {
        const supabase = await createClient();
        const { data, error: dbError } = await supabase
            .from("exams")
            .select("*")
            .order("created_at", { ascending: false });

        if (dbError) {
            error = dbError.message;
        } else {
            exams = data || [];
        }
    } catch {
        error = "Unable to connect to the database. Please check your Supabase configuration.";
    }

    return <ExamCatalog exams={exams} error={error} />;
}

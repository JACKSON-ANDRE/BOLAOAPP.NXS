import { supabase } from '../lib/supabase';

export interface HealthIssue {
    type: 'integrity' | 'financial' | 'operational';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    table: string;
    fix_hint: string;
}

export interface HealthReport {
    status: 'healthy' | 'warning' | 'critical';
    checked_at: string;
    issues: HealthIssue[];
    metrics: {
        orphan_bets: number;
        orphan_pools: number;
        negative_balances: number;
        stuck_deposits: number;
    };
}

export const SystemHealthService = {
    /**
     * Runs the full diagnostic check via RPC.
     */
    async checkIntegrity(): Promise<HealthReport | null> {
        try {
            const { data, error } = await supabase.rpc('get_system_health_report');
            if (error) throw error;
            return data as HealthReport;
        } catch (err) {
            console.error('Failed to run system check:', err);
            // Fallback for safety if RPC fails
            return null;
        }
    },

    /**
     * Generates a "Prompt" string that the user can copy/paste to the AI
     * to fix the specific issues found.
     */
    generateFixPrompt(report: HealthReport): string {
        if (!report || report.issues.length === 0) return '';

        let prompt = `SYSTEM DIAGNOSTIC REPORT - PLEASE FIX ISSUES\n\n`;
        prompt += `Status: ${report.status.toUpperCase()}\n`;
        prompt += `Checked At: ${new Date(report.checked_at).toLocaleString()}\n\n`;

        prompt += `ISSUES FOUND:\n`;
        report.issues.forEach((issue, index) => {
            prompt += `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}\n`;
            prompt += `   Table: ${issue.table}\n`;
            prompt += `   Suggested Fix: ${issue.fix_hint}\n`;
        });

        prompt += `\nINSTRUCTIONS FOR AI:\n`;
        prompt += `1. Analyze the issues above.\n`;
        prompt += `2. Create a specific SQL migration script to fix these database inconsistencies.\n`;
        prompt += `3. Ensure the script uses 'DO $$ BEGIN ... END $$;' to handle errors gracefully.\n`;
        prompt += `4. Provide the SQL code clearly so I can run it in Supabase SQL Editor.\n`;

        return prompt;
    }
};

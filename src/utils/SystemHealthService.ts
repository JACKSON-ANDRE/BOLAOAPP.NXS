import { supabase } from '../../lib/supabase';

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
    issues: string[];
    metrics: {
        negative_balances: number;
        orphan_bets: number;
        stuck_deposits: number;
        stuck_withdraws: number;
        duplicate_deposits: number;
        orphan_txs?: number;
    };
    fixPrompt?: string; // Optional client-side added
    totalLoss?: number; // Optional client-side added
}

export const SystemHealthService = {
    /**
     * Runs the full diagnostic check via RPC.
     */
    async checkIntegrity(): Promise<HealthReport | null> {
        try {
            const { data, error } = await supabase.rpc('get_system_health_report');
            if (error) throw error;

            // Map RPC result to TypeScript interface
            // The RPC returns underscores, the interface uses underscores. Direct cast.
            return data as HealthReport;
        } catch (err) {
            console.error('Failed to run system check:', err);
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
            prompt += `${index + 1}. ${issue}\n`;
        });

        prompt += `\nINSTRUCTIONS FOR AI:\n`;
        prompt += `1. Analyze the issues above.\n`;
        prompt += `2. Create a specific SQL migration script to fix these database inconsistencies.\n`;
        prompt += `3. Ensure the script uses 'DO $$ BEGIN ... END $$;' to handle errors gracefully.\n`;
        prompt += `4. Provide the SQL code clearly so I can run it in Supabase SQL Editor.\n`;

        return prompt;
    }
};

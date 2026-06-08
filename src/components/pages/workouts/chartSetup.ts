/**
 * chartSetup.ts — Chart.js tree-shakeable registration (Pattern 2, 07-RESEARCH.md).
 *
 * Import this module once in any file that uses Chart.js; the side-effect
 * at module scope registers all components needed for Phase 7 charts:
 *   - BarController / BarElement   → horizontal bar chart (MuscleVolumeTab)
 *   - LineController / LineElement → line charts (MuscleVolumeTab, ProgressionTab, ContextTab)
 *   - PointElement                 → data points on line charts
 *   - CategoryScale / LinearScale  → x/y axes
 *   - Tooltip / Legend             → interactivity
 *   - Filler                       → area fill for bodyweight sparkline (ContextTab, 07-05)
 *
 * Do NOT use chart.js/auto — it registers ALL chart types, defeating tree-shaking.
 * Do NOT call Chart.register inside a component function — registration must run once
 * at module scope (07-RESEARCH.md Anti-Patterns, Pitfall 3).
 */
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

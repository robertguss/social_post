"use client";

import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";

/**
 * Performance Insights Data Structure
 */
interface HourlyData {
  hour: number;
  avgLikes: number;
  avgShares: number;
  avgComments: number;
  avgImpressions?: number;
  postCount: number;
  totalEngagement: number;
}

interface InsightsData {
  hourlyData: HourlyData[];
  hasData: boolean;
  featureEnabled: boolean;
}

/**
 * Performance Insights Component
 *
 * Displays aggregated engagement metrics and best-performing posting times
 * based on historical data from published posts.
 *
 * Features:
 * - Filter by platform (Twitter/LinkedIn)
 * - Filter by date range (7 days, 30 days, all time)
 * - Visualize engagement by hour of day
 * - Show top-performing time slots
 *
 * NOTE: This feature is inactive until API access is configured.
 * Displays setup instructions when feature is disabled or no data exists.
 */
export function PerformanceInsights() {
  const [platform, setPlatform] = useState<"twitter" | "linkedin">("twitter");
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "alltime">("30days");
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const getPerformanceInsights = useAction(
    api.analytics.getPerformanceInsights
  );

  // Fetch insights when filters change
  useEffect(() => {
    async function fetchInsights() {
      setLoading(true);
      try {
        const data = await getPerformanceInsights({
          platform,
          dateRangeFilter: dateRange,
        });
        setInsights(data);
      } catch (error) {
        console.error("Failed to fetch insights:", error);
        setInsights(null);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [platform, dateRange, getPerformanceInsights]);

  // Feature not enabled state
  if (insights && !insights.featureEnabled) {
    return (
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">Performance Insights</h1>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2 text-yellow-800">
            Feature Not Yet Active
          </h2>
          <p className="text-yellow-700 mb-4">
            Performance tracking is not yet enabled. This feature requires API access
            to Twitter and LinkedIn engagement metrics.
          </p>
          <p className="text-yellow-700 mb-4">
            To enable this feature, you need to:
          </p>
          <ol className="list-decimal list-inside text-yellow-700 space-y-2 mb-4">
            <li>Configure Twitter API access with analytics permissions</li>
            <li>Configure LinkedIn API access with analytics permissions</li>
            <li>Add API credentials to Convex environment variables</li>
            <li>Set PERFORMANCE_TRACKING_ENABLED=true</li>
          </ol>
          <p className="text-sm text-yellow-600">
            See{" "}
            <code className="bg-yellow-100 px-2 py-1 rounded">
              docs/features/performance-tracking.md
            </code>{" "}
            for detailed setup instructions.
          </p>
        </div>
      </div>
    );
  }

  // No data state (feature enabled but no metrics collected yet)
  if (insights && insights.featureEnabled && !insights.hasData) {
    return (
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">Performance Insights</h1>

        {/* Filter Controls */}
        <div className="bg-white border rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as "twitter" | "linkedin")}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="twitter">Twitter</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) =>
                  setDateRange(e.target.value as "7days" | "30days" | "alltime")
                }
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="alltime">All Time</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2 text-blue-800">
            No Performance Data Available
          </h2>
          <p className="text-blue-700 mb-4">
            No engagement metrics have been collected yet for {platform}.
          </p>
          <p className="text-blue-700">
            Performance data will be automatically collected from your published posts
            once the scheduled metrics fetching is activated. This typically runs daily
            to retrieve engagement metrics from Twitter and LinkedIn.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading || !insights) {
    return (
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">Performance Insights</h1>
        <div className="bg-white border rounded-lg p-8 text-center">
          <p className="text-gray-500">Loading insights...</p>
        </div>
      </div>
    );
  }

  // Find top 3 performing hours
  const topHours = [...insights.hourlyData]
    .filter((data: HourlyData) => data.postCount > 0)
    .sort((a: HourlyData, b: HourlyData) => b.totalEngagement - a.totalEngagement)
    .slice(0, 3);

  return (
    <div className="container mx-auto px-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Performance Insights</h1>

      {/* Filter Controls */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as "twitter" | "linkedin")}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="twitter">Twitter</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) =>
                setDateRange(e.target.value as "7days" | "30days" | "alltime")
              }
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="alltime">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top Performing Times */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Top Performing Times</h2>
        {topHours.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topHours.map((hourData: HourlyData, index: number) => (
              <div
                key={hourData.hour}
                className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-white"
              >
                <div className="text-sm text-gray-500 mb-1">#{index + 1} Best Time</div>
                <div className="text-2xl font-bold mb-2">
                  {formatHour(hourData.hour)}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Engagement:</span>
                    <span className="font-semibold">{hourData.totalEngagement}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Posts:</span>
                    <span className="font-semibold">{hourData.postCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Likes:</span>
                    <span className="font-semibold">{hourData.avgLikes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Shares:</span>
                    <span className="font-semibold">{hourData.avgShares}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Comments:</span>
                    <span className="font-semibold">{hourData.avgComments}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            Not enough data to determine top performing times.
          </p>
        )}
      </div>

      {/* Hourly Breakdown Table */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Hourly Performance Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Time (UTC)</th>
                <th className="text-right py-2 px-4">Posts</th>
                <th className="text-right py-2 px-4">Engagement</th>
                <th className="text-right py-2 px-4">Avg Likes</th>
                <th className="text-right py-2 px-4">Avg Shares</th>
                <th className="text-right py-2 px-4">Avg Comments</th>
              </tr>
            </thead>
            <tbody>
              {insights.hourlyData
                .filter((data: HourlyData) => data.postCount > 0)
                .sort((a: HourlyData, b: HourlyData) => b.totalEngagement - a.totalEngagement)
                .map((hourData: HourlyData) => (
                  <tr key={hourData.hour} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">
                      {formatHour(hourData.hour)}
                    </td>
                    <td className="text-right py-2 px-4">{hourData.postCount}</td>
                    <td className="text-right py-2 px-4 font-semibold">
                      {hourData.totalEngagement}
                    </td>
                    <td className="text-right py-2 px-4">{hourData.avgLikes}</td>
                    <td className="text-right py-2 px-4">{hourData.avgShares}</td>
                    <td className="text-right py-2 px-4">{hourData.avgComments}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {insights.hourlyData.filter((data: HourlyData) => data.postCount > 0).length === 0 && (
          <p className="text-gray-500 text-center py-4">No data available</p>
        )}
      </div>
    </div>
  );
}

/**
 * Formats hour (0-23) to 12-hour time format
 * @param hour - Hour in 24-hour format (0-23)
 * @returns Formatted time string (e.g., "9:00 AM", "2:00 PM")
 */
function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}

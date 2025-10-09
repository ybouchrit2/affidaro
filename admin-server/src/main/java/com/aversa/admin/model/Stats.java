package com.aversa.admin.model;

import java.util.List;
import java.util.Map;

public class Stats {
    private int total;
    private int today;
    private Map<String, Integer> byPage;
    private List<VisitEntry> recent;
    private long avgDurationMs;

    public Stats(int total, int today, Map<String, Integer> byPage, List<VisitEntry> recent) {
        this.total = total;
        this.today = today;
        this.byPage = byPage;
        this.recent = recent;
    }

    public Stats(int total, int today, Map<String, Integer> byPage, List<VisitEntry> recent, long avgDurationMs) {
        this.total = total;
        this.today = today;
        this.byPage = byPage;
        this.recent = recent;
        this.avgDurationMs = avgDurationMs;
    }

    public int getTotal() { return total; }
    public int getToday() { return today; }
    public Map<String, Integer> getByPage() { return byPage; }
    public List<VisitEntry> getRecent() { return recent; }
    public long getAvgDurationMs() { return avgDurationMs; }
}
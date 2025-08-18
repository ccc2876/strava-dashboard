// pages/WeeklyDetail.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useRunsForWeek } from "@/lib/data";

export default function WeeklyDetail() {
  const runs = useRunsForWeek(); // load this week's runs, implement this hook or replace with prop/state

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">This Week's Runs</h1>
      {runs.map((run) => (
        <Card key={run.id}>
          <CardHeader>
            <CardTitle>{run.date} - {run.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p>Distance: {run.distance} mi</p>
            <p>Pace: {run.pace}</p>
            <p>Time: {run.duration}</p>
            <p>Notes: {run.notes}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

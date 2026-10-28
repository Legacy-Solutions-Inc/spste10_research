"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCount, formatDurationMs, type OfficeStats } from "./metrics";

function Header() {
  return (
    <div className="p-5">
      <h2 className="text-base font-semibold text-foreground">Response by office</h2>
      <p className="mt-1 max-w-prose text-13 text-muted-foreground">
        How each office responded to incidents received in this range, sorted by most accepted. Time to accept runs from
        when the citizen sent the incident to when this office accepted it.
      </p>
    </div>
  );
}

function Columns() {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead>Office</TableHead>
        <TableHead className="text-right">Accepted</TableHead>
        <TableHead className="text-right">Declined</TableHead>
        <TableHead className="text-right">Resolved</TableHead>
        <TableHead className="whitespace-nowrap text-right">Median time to accept</TableHead>
      </TableRow>
    </TableHeader>
  );
}

export function OfficeTable({ offices }: { offices: OfficeStats[] }) {
  return (
    <Card className="overflow-hidden">
      <Header />
      {offices.length === 0 ? (
        <p className="border-t px-5 py-6 text-sm text-muted-foreground">
          No office accepted or declined an incident received in this range.
        </p>
      ) : (
        <div className="border-t">
          <Table>
            <caption className="sr-only">Response by office</caption>
            <Columns />
            <TableBody>
              {offices.map((office) => (
                <TableRow key={office.id}>
                  <TableCell className="min-w-[12rem] font-medium text-foreground">{office.name}</TableCell>
                  <TableCell className="tabular text-right">{formatCount(office.accepted)}</TableCell>
                  <TableCell className="tabular text-right">{formatCount(office.declined)}</TableCell>
                  <TableCell className="tabular text-right">{formatCount(office.resolved)}</TableCell>
                  <TableCell className="tabular whitespace-nowrap text-right">
                    {office.medianAccept === null ? (
                      <span className="text-muted-foreground">
                        {office.accepted === 0 ? "No accepts" : "Not recorded"}
                      </span>
                    ) : (
                      formatDurationMs(office.medianAccept)
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

export function OfficeTableSkeleton() {
  return (
    <Card className="overflow-hidden" aria-hidden>
      <div className="p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="space-y-3 border-t p-5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-64" />
          </div>
        ))}
      </div>
    </Card>
  );
}

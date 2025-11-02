'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'

interface ContinuityReport {
  totalSegments: number
  validatedSegments: number
  averageScore: number
  issuesByType: Record<string, number>
  issuesBySeverity: Record<string, number>
  segmentsWithIssues: number
  validations: Array<{
    segmentNumber: number
    isValid: boolean
    score: number
    issueCount: number
    issues: Array<{
      type: string
      severity: string
      description: string
    }>
  }>
}

interface ContinuityReportViewerProps {
  report: ContinuityReport
}

export function ContinuityReportViewer({ report }: ContinuityReportViewerProps) {
  const scoreColor = getScoreColor(report.averageScore)
  const scoreLabel = getScoreLabel(report.averageScore)

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Continuity Report</CardTitle>
            <CardDescription>
              Visual consistency analysis across {report.validatedSegments} segments
            </CardDescription>
          </div>
          <Badge variant={scoreColor === 'green' ? 'default' : 'secondary'} className="text-lg px-3 py-1">
            {report.averageScore}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Continuity Score</span>
            <span className={`font-medium text-${scoreColor}-600`}>{scoreLabel}</span>
          </div>
          <Progress
            value={report.averageScore}
            className="h-2"
          />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1 p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{report.totalSegments}</div>
            <div className="text-xs text-muted-foreground">Total Segments</div>
          </div>
          <div className="space-y-1 p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              {report.validatedSegments - report.segmentsWithIssues}
            </div>
            <div className="text-xs text-green-700">Valid Segments</div>
          </div>
          <div className="space-y-1 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-700">{report.segmentsWithIssues}</div>
            <div className="text-xs text-yellow-700">With Issues</div>
          </div>
        </div>

        {/* Issues by Type */}
        {Object.keys(report.issuesByType).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Issues by Type</h4>
            <div className="space-y-2">
              {Object.entries(report.issuesByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground capitalize">
                    {type.replace(/_/g, ' ')}
                  </span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issues by Severity */}
        {Object.keys(report.issuesBySeverity).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Issues by Severity</h4>
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'critical'] as const).map((severity) => {
                const count = report.issuesBySeverity[severity] || 0
                const icon = getSeverityIcon(severity)
                const color = getSeverityColor(severity)

                return (
                  <div
                    key={severity}
                    className={`p-3 rounded-lg border bg-${color}-50 border-${color}-200`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {icon}
                      <span className="text-xs font-medium capitalize">{severity}</span>
                    </div>
                    <div className={`text-2xl font-bold text-${color}-700`}>{count}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Segment-by-Segment Breakdown */}
        {report.validations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Segment Details</h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {report.validations.map((validation) => (
                <div
                  key={validation.segmentNumber}
                  className={`p-3 rounded-lg border ${
                    validation.isValid
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        #{validation.segmentNumber}
                      </Badge>
                      {validation.isValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{validation.score}/100</span>
                      {validation.issueCount > 0 && (
                        <Badge variant="secondary">{validation.issueCount} issues</Badge>
                      )}
                    </div>
                  </div>

                  {validation.issues.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {validation.issues.slice(0, 3).map((issue, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="font-medium capitalize">[{issue.severity}]</span>
                          <span>{issue.description}</span>
                        </div>
                      ))}
                      {validation.issues.length > 3 && (
                        <div className="text-xs text-muted-foreground italic">
                          +{validation.issues.length - 3} more issues
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-900">
            {report.averageScore >= 90
              ? 'Excellent continuity! Visual flow is highly consistent across segments.'
              : report.averageScore >= 75
              ? 'Good continuity with minor issues. Most transitions are smooth.'
              : report.averageScore >= 60
              ? 'Acceptable continuity with some issues. Review flagged segments.'
              : 'Significant continuity issues detected. Consider reviewing segment boundaries and transitions.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'green'
  if (score >= 75) return 'blue'
  if (score >= 60) return 'yellow'
  return 'red'
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 60) return 'Fair'
  return 'Poor'
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'low':
      return <Info className="h-3 w-3 text-blue-600" />
    case 'medium':
      return <AlertTriangle className="h-3 w-3 text-yellow-600" />
    case 'high':
      return <AlertTriangle className="h-3 w-3 text-orange-600" />
    case 'critical':
      return <XCircle className="h-3 w-3 text-red-600" />
    default:
      return null
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'low':
      return 'blue'
    case 'medium':
      return 'yellow'
    case 'high':
      return 'orange'
    case 'critical':
      return 'red'
    default:
      return 'gray'
  }
}

'use client'

/**
 * AI Persona Document Generator & Editor
 *
 * Generate persona documents using AI and edit them for accuracy
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Sparkles,
  Save,
  Download,
  Edit2,
  Check,
  AlertCircle
} from 'lucide-react'

type PersonaType = 'exhibitor' | 'target_company' | 'target_people'

interface PersonaDocument {
  type: PersonaType
  title: string
  content: string
  isGenerated: boolean
  isEdited: boolean
}

export default function PersonaGeneratorPage() {
  const [personas, setPersonas] = useState<Record<PersonaType, PersonaDocument>>({
    exhibitor: {
      type: 'exhibitor',
      title: 'Exhibitor Persona',
      content: '',
      isGenerated: false,
      isEdited: false,
    },
    target_company: {
      type: 'target_company',
      title: 'Target Company Persona',
      content: '',
      isGenerated: false,
      isEdited: false,
    },
    target_people: {
      type: 'target_people',
      title: 'Target People Persona',
      content: '',
      isGenerated: false,
      isEdited: false,
    },
  })

  const [generating, setGenerating] = useState<PersonaType | null>(null)
  const [editing, setEditing] = useState<PersonaType | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<PersonaType | null>(null)

  // Generate persona using AI
  const generatePersona = async (type: PersonaType) => {
    setGenerating(type)
    try {
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 2000))

      const templates = {
        exhibitor: `# Exhibitor Persona

## Overview
This document defines the ideal exhibitor profile for our trade show intelligence platform.

## Demographics
- **Industry**: Technology, SaaS, B2B
- **Company Size**: 50-5000 employees
- **Revenue**: $5M-$500M annual revenue
- **Growth Stage**: Series A to Public

## Characteristics
### Business Model
- B2B focused with enterprise sales
- Subscription-based or recurring revenue
- Technical product or service offering

### Trade Show Participation
- Active at 3-10 trade shows annually
- Budget: $50K-$500K per show
- Team size: 5-20 booth staff
- Goal: Lead generation and brand awareness

## Pain Points
- Difficulty qualifying leads post-show
- Manual data entry and enrichment
- Lack of real-time intelligence
- Poor lead handoff to sales team

## Goals
- Increase qualified lead conversion by 30%
- Reduce time-to-contact from days to hours
- Improve ROI tracking per show
- Automate lead scoring and routing

## Decision Criteria
- Proven ROI and case studies
- Easy integration with existing CRM
- Mobile-friendly for booth use
- Real-time enrichment capabilities`,

        target_company: `# Target Company Persona

## Overview
Defines the ideal customer company profile for our exhibitors' products/services.

## Firmographics
- **Industry**: Varies by exhibitor vertical
- **Company Size**: 100-10,000 employees
- **Revenue**: $10M-$1B annual revenue
- **Location**: North America, Europe, APAC

## Company Characteristics
### Organizational Structure
- Established procurement process
- Multiple decision-makers
- Budget authority for technology purchases

### Technology Profile
- Modern tech stack
- Cloud-first or cloud-friendly
- API integration capabilities
- Data-driven decision making

### Business Indicators
- Growing or stable revenue
- Recent funding or profitability
- Digital transformation initiatives
- Active in industry events

## Signals of Interest
### Behavioral
- Attended relevant trade shows
- Downloaded related whitepapers
- Visited exhibitor website
- Engaged with booth staff

### Contextual
- Job openings in relevant departments
- Recent technology investments
- Industry certifications
- Partnership announcements

## Scoring Criteria
| Factor | Weight | Description |
|--------|--------|-------------|
| Industry Match | 30% | Alignment with target vertical |
| Company Size | 25% | Within ideal employee range |
| Technology Fit | 20% | Compatible tech stack |
| Engagement | 15% | Booth interaction quality |
| Timing | 10% | Budget cycle alignment |`,

        target_people: `# Target People Persona

## Overview
Defines the ideal individual contact profiles within target companies.

## Demographics
- **Job Titles**: VP/Director/Manager level
- **Departments**: Sales, Marketing, Operations, IT
- **Experience**: 5-15 years in role
- **Education**: Bachelor's degree or higher

## Primary Personas

### Persona 1: The Economic Buyer
**Title**: VP of Sales, Chief Revenue Officer, VP of Marketing

**Responsibilities**:
- Budget authority for technology purchases
- Revenue and growth goals
- Team performance metrics

**Pain Points**:
- Need to improve team efficiency
- Pressure to increase pipeline
- ROI justification requirements

**Goals**:
- Increase team productivity by 20%
- Reduce cost per lead
- Improve sales cycle velocity

### Persona 2: The Technical Champion
**Title**: Marketing Operations Manager, Sales Operations Manager, IT Manager

**Responsibilities**:
- Technology stack evaluation
- Implementation and integration
- User training and adoption

**Pain Points**:
- Integration complexity
- Data quality issues
- Tool sprawl management

**Goals**:
- Streamline workflows
- Improve data accuracy
- Reduce manual work

### Persona 3: The End User
**Title**: Sales Representative, Marketing Manager, BDR

**Responsibilities**:
- Day-to-day lead management
- Outreach and follow-up
- CRM data entry

**Pain Points**:
- Too many manual tasks
- Lack of lead context
- Slow response times

**Goals**:
- More qualified leads
- Better lead information
- Faster follow-up process

## Engagement Preferences
- **Communication**: Email, LinkedIn, phone
- **Content**: Case studies, ROI calculators, demos
- **Timing**: Quarterly budget reviews, fiscal year planning
- **Decision Process**: 3-6 months, 3-5 stakeholders`
      }

      setPersonas(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          content: templates[type],
          isGenerated: true,
          isEdited: false,
        },
      }))
    } catch (error) {
      alert('Failed to generate persona')
    } finally {
      setGenerating(null)
    }
  }

  // Save edited persona
  const savePersona = async (type: PersonaType) => {
    try {
      // Simulate API save
      await new Promise(resolve => setTimeout(resolve, 500))

      setPersonas(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          isEdited: false,
        },
      }))

      setSaveSuccess(type)
      setTimeout(() => setSaveSuccess(null), 2000)
      setEditing(null)
    } catch (error) {
      alert('Failed to save persona')
    }
  }

  // Download persona as markdown
  const downloadPersona = (type: PersonaType) => {
    const persona = personas[type]
    const blob = new Blob([persona.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}_persona.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Update persona content
  const updateContent = (type: PersonaType, content: string) => {
    setPersonas(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        content,
        isEdited: true,
      },
    }))
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Persona Generator</h1>
        <p className="text-slate-600">
          Generate and customize persona documents for better lead scoring
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {(Object.keys(personas) as PersonaType[]).map(type => {
          const persona = personas[type]
          return (
            <Card key={type} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <FileText className="w-5 h-5 text-slate-600" />
                {persona.isGenerated && (
                  <Badge variant={persona.isEdited ? 'default' : 'secondary'}>
                    {persona.isEdited ? 'Modified' : 'Generated'}
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold mb-1">{persona.title}</h3>
              <p className="text-sm text-slate-600 mb-3">
                {type.replace(/_/g, ' ')}
              </p>
              {!persona.isGenerated ? (
                <Button
                  onClick={() => generatePersona(type)}
                  disabled={generating === type}
                  size="sm"
                  className="w-full gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {generating === type ? 'Generating...' : 'Generate with AI'}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setEditing(editing === type ? null : type)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => downloadPersona(type)}
                    variant="ghost"
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Success Alert */}
      {saveSuccess && (
        <Alert variant="default" className="mb-6 bg-green-50 border-green-200">
          <Check className="w-4 h-4" />
          Successfully saved {personas[saveSuccess].title}!
        </Alert>
      )}

      {/* Editor Tabs */}
      <Card className="p-6">
        <Tabs defaultValue="exhibitor" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="exhibitor">Exhibitor</TabsTrigger>
            <TabsTrigger value="target_company">Target Company</TabsTrigger>
            <TabsTrigger value="target_people">Target People</TabsTrigger>
          </TabsList>

          {(Object.keys(personas) as PersonaType[]).map(type => {
            const persona = personas[type]
            const isEditing = editing === type

            return (
              <TabsContent key={type} value={type} className="mt-4">
                {!persona.isGenerated ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">
                      No persona generated yet
                    </p>
                    <Button
                      onClick={() => generatePersona(type)}
                      disabled={generating === type}
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {generating === type ? 'Generating...' : 'Generate with AI'}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">{persona.title}</h3>
                      <div className="flex gap-2">
                        {isEditing && persona.isEdited && (
                          <Button
                            onClick={() => savePersona(type)}
                            size="sm"
                            className="gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Save Changes
                          </Button>
                        )}
                        <Button
                          onClick={() => setEditing(isEditing ? null : type)}
                          variant={isEditing ? 'outline' : 'default'}
                          size="sm"
                          className="gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          {isEditing ? 'View Mode' : 'Edit Mode'}
                        </Button>
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        value={persona.content}
                        onChange={(e) => updateContent(type, e.target.value)}
                        className="w-full h-[600px] p-4 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="prose max-w-none">
                        <pre className="whitespace-pre-wrap bg-slate-50 p-4 rounded-lg text-sm">
                          {persona.content}
                        </pre>
                      </div>
                    )}

                    {persona.isEdited && (
                      <Alert variant="default" className="mt-4 bg-yellow-50 border-yellow-200">
                        <AlertCircle className="w-4 h-4" />
                        You have unsaved changes. Click "Save Changes" to persist your edits.
                      </Alert>
                    )}
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </Card>

      {/* Help Section */}
      <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-3">How to Use:</h3>
        <ol className="text-sm text-slate-700 space-y-2">
          <li>1. Click "Generate with AI" to create initial persona documents</li>
          <li>2. Review the generated content carefully</li>
          <li>3. Click "Edit Mode" to modify the markdown content</li>
          <li>4. Make necessary corrections to ensure accuracy</li>
          <li>5. Click "Save Changes" to persist your edits</li>
          <li>6. Download the final persona documents as .md files</li>
        </ol>
      </Card>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import {
  SCREENING_ANSWER_KEYS,
  SCREENING_ANSWER_LABELS,
  SCREENING_ANSWER_MAX_LENGTH,
  SCREENING_QUESTION_MAX_LENGTH,
  type ScreeningAnswerKey,
  type ScreeningAnswers,
} from "@cvforge/types"

import { saveScreeningAnswers } from "@/app/(app)/profile/reponses/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type CustomRow = { id: number; question: string; answer: string }

/** The answers the extension may give on the candidate's behalf. */
export function ScreeningAnswersForm({
  answers,
}: {
  answers: ScreeningAnswers
}) {
  const [known, setKnown] = useState<Record<ScreeningAnswerKey, string>>(
    () =>
      Object.fromEntries(
        SCREENING_ANSWER_KEYS.map((key) => [key, answers.known[key] ?? ""])
      ) as Record<ScreeningAnswerKey, string>
  )
  const [custom, setCustom] = useState<CustomRow[]>(() =>
    answers.custom.map((entry, id) => ({ id, ...entry }))
  )
  const [nextId, setNextId] = useState(answers.custom.length)
  const [pending, startTransition] = useTransition()

  const updateRow = (id: number, patch: Partial<CustomRow>) =>
    setCustom((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    )

  const save = () =>
    startTransition(async () => {
      const result = await saveScreeningAnswers({
        custom: custom.map(({ question, answer }) => ({
          answer,
          question,
          updatedAt: "",
        })),
        known,
      })
      if (result.ok) toast.success(result.message ?? "Réponses enregistrées.")
      else toast.error(result.message)
    })

  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Questions fréquentes</CardTitle>
          <CardDescription>
            Laissez vide ce que vous préférez donner au cas par cas :
            l&apos;extension vous le demandera.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {SCREENING_ANSWER_KEYS.map((key) => (
              <Field key={key}>
                <FieldLabel htmlFor={`screening-${key}`}>
                  {SCREENING_ANSWER_LABELS[key].label}
                </FieldLabel>
                <Input
                  id={`screening-${key}`}
                  maxLength={SCREENING_ANSWER_MAX_LENGTH}
                  placeholder={`Ex. ${SCREENING_ANSWER_LABELS[key].example}`}
                  value={known[key]}
                  onChange={(event) =>
                    setKnown((values) => ({
                      ...values,
                      [key]: event.target.value,
                    }))
                  }
                />
              </Field>
            ))}
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Autres questions</CardTitle>
          <CardDescription>
            Les réponses que vous avez données à l&apos;extension et choisi de
            garder pour vos prochaines candidatures.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {custom.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune pour l&apos;instant.
            </p>
          )}
          {custom.map((row, index) => (
            <FieldGroup key={row.id} className="rounded-md border p-3">
              <Field>
                <FieldLabel htmlFor={`custom-question-${row.id}`}>
                  Question {index + 1}
                </FieldLabel>
                <Input
                  id={`custom-question-${row.id}`}
                  maxLength={SCREENING_QUESTION_MAX_LENGTH}
                  value={row.question}
                  onChange={(event) =>
                    updateRow(row.id, { question: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`custom-answer-${row.id}`}>
                  Réponse
                </FieldLabel>
                <Textarea
                  id={`custom-answer-${row.id}`}
                  maxLength={SCREENING_ANSWER_MAX_LENGTH}
                  value={row.answer}
                  onChange={(event) =>
                    updateRow(row.id, { answer: event.target.value })
                  }
                />
                <FieldDescription>
                  Une question laissée sans réponse est retirée à
                  l&apos;enregistrement.
                </FieldDescription>
              </Field>
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCustom((rows) => rows.filter((r) => r.id !== row.id))
                  }
                >
                  <Trash2Icon />
                  Retirer la question {index + 1}
                </Button>
              </div>
            </FieldGroup>
          ))}
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCustom((rows) => [
                  ...rows,
                  { answer: "", id: nextId, question: "" },
                ])
                setNextId((id) => id + 1)
              }}
            >
              <PlusIcon />
              Ajouter une question
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  )
}

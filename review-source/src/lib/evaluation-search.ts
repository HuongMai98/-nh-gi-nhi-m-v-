import { mainStageOf, type Evaluation } from "./evaluation";

export function matchesAdvancedSearch(e: Evaluation, filter: { employeeId: string; owner: string; id: string; block: string; status: string }) {
  const contains = (value: string, search: string) => value.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"));
  const status = e.step === "response" || e.step === "council_adjust" ? e.step : mainStageOf(e);
  return contains(e.employeeId ?? "", filter.employeeId) && contains(e.owner, filter.owner) && contains(e.id, filter.id)
    && (!filter.block || e.block === filter.block) && (!filter.status || status === filter.status);
}

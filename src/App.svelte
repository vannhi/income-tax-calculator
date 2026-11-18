<script lang="ts">
  import { computeIncomeTax, householdFromInput, reviseTaxConfig, taxConfig } from './income-tax';

  function extractParamNumberValue(q: URLSearchParams, paramName: string) {
    const value = q.get(paramName)?.trim();
    if (!value) {
      return undefined;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }

  function positive(n: number | undefined) {
    return n !== undefined && n > 0 ? n : undefined;
  }

  const query = new URLSearchParams(location.search);
  const incomeStep = positive(extractParamNumberValue(query, 'step')) ?? 100;
  const marginalGap = positive(extractParamNumberValue(query, 'gap')) ?? 1000;
  // Number fields are bound to null when empty
  let income = $state<number | null>(extractParamNumberValue(query, 'income') ?? 30000);
  let married = $state(![null, 'false', '0'].includes(query.get('married')));
  let childrenCount = $state<number | null>(extractParamNumberValue(query, 'children') ?? 0);
  let reviseRatePercent = $state<number | null>(extractParamNumberValue(query, 'reviseRate') ?? 2.1);
  let estimateNextYear = $state(!['false', '0', null].includes(query.get('estimateNextYear')));

  function formatFr(n: number): string {
    return n.toLocaleString('fr', {maximumFractionDigits: 2});
  }

  const config = $derived(estimateNextYear && reviseRatePercent ? reviseTaxConfig(taxConfig, 1 + reviseRatePercent / 100) : taxConfig);
  const taxRanges = $derived(config.ranges);

  const household = $derived(householdFromInput(income, married, childrenCount));
  const result = $derived(computeIncomeTax(household, config));
  const marginalRate = $derived((computeIncomeTax({...household, income: household.income + marginalGap}, config).tax - result.tax) / marginalGap);

  // Keep the address bar in sync so the current scenario can be shared
  $effect(() => {
    const searchParams = new URLSearchParams();
    searchParams.append('income', `${income ?? ''}`);
    searchParams.append('step', `${incomeStep}`);
    searchParams.append('married', `${married}`);
    searchParams.append('children', `${childrenCount ?? ''}`);
    searchParams.append('gap', `${marginalGap}`);
    if (estimateNextYear) {
      searchParams.append('estimateNextYear', 'true');
      searchParams.append('reviseRate', `${reviseRatePercent ?? ''}`);
    }
    history.replaceState(history.state, '', `?${searchParams}`);
  });
</script>

<main class="p-4 mx-auto">
  <h1 class="text-center text-red-700 uppercase text-3xl font-light leading-tight">Simulateur simplifié de l'impôt 2026 sur les revenus 2025</h1>
  <div class="flex">
    <div class="mx-auto sm:max-w-2xl">
      <h2 class="text-2xl mt-8 leading-10">Situation</h2>
      <div class="grid grid-cols-[max-content_max-content] gap-x-8 gap-y-2 items-center">
        <div id="married-label" class="mr-2">État matrimonial</div>
        <div role="radiogroup" aria-labelledby="married-label" class="flex flex-wrap gap-x-4">
          <label class="cursor-pointer flex items-center gap-2">
            <input type="radio" name="married" class="radio radio-sm" value={false} bind:group={married} />
            Célibataire
          </label>
          <label class="cursor-pointer flex items-center gap-2">
            <input type="radio" name="married" class="radio radio-sm" value={true} bind:group={married} />
            Marié / pacsé
          </label>
        </div>

        <label for="children-count">Enfants à charge</label>
        <input type="number" min="0" step="1" id="children-count" class="w-16 px-1 rounded-md border-2 border-gray-500" bind:value={childrenCount} />

        <label for="income">Revenu du foyer<span class="sr-only"> en euros</span></label>
        <span class="flex items-center gap-1">
          <input id="income" type="number" class="w-28 px-2 rounded-md border-2 border-gray-500" min="0" step={incomeStep} aria-describedby="income-help" bind:value={income} />
          <span aria-hidden="true">€</span>
        </span>
      </div>
      <p id="income-help" class="mt-1 text-sm text-gray-500">Renseigner la valeur après avoir déduit les frais réels, abattement 10% frais, abattement micro entreprise, etc.</p>

      <h2 class="text-2xl mt-8 leading-10">Résultat</h2>
      <!-- Announced to screen readers whenever an input changes -->
      <dl class="shadow-sm stats stats-vertical sm:stats-horizontal" aria-live="polite" aria-atomic="true">
        <div class="stat">
          <dt class="stat-title">Impôt</dt>
          <dd class="stat-value text-sky-700">{formatFr(result.tax)} €</dd>
          <dd class="stat-desc">Soit {((result.tax / household.income) || 0).toLocaleString('fr', {style: 'percent', minimumFractionDigits:2, maximumFractionDigits: 2})} du revenu</dd>
          {#if result.tax > 0 && !result.collected}
            <dd class="stat-desc">Non recouvré (inférieur à {config.collectionThreshold} €)</dd>
          {/if}
        </div>
        <div class="stat">
          <dt class="stat-title">Taux marginal</dt>
          <dd class="stat-value text-red-700">{formatFr(marginalRate*100)} %</dd>
          <dd class="stat-desc whitespace-normal!">Pour +{formatFr(marginalGap)} € de revenu : +{formatFr(marginalRate*marginalGap)} € d'impôt</dd>
        </div>
      </dl>
      <p class="mt-1 text-sm text-gray-500">Le taux marginal inclut les effets de la décote et du plafonnement : il peut différer du taux de la tranche.</p>

      <div>
        <label class="mt-10 cursor-pointer inline-flex">
          <span>Estimer l'impôt 2027 sur les revenus 2026 ?</span>
          <input type="checkbox" class="ml-2 toggle toggle-accent" bind:checked={estimateNextYear} />
        </label>

        <span class="ml-4" class:invisible={!estimateNextYear}>
          <label for="revise-rate">Revalorisation estimée</label>
          <input id="revise-rate" type="number" class="ml-1 w-16 px-1 rounded-md border-2 border-gray-500" min="0" step="0.1" aria-describedby="revise-rate-help" bind:value={reviseRatePercent} />
          %
          <span id="revise-rate-help" class="block text-sm text-gray-500">La revalorisation est déterminée à la fin d'année pour compenser l'inflation. Elle est de 0,9% pour 2026 par rapport à 2025, et estimée à 2,1% pour l'année prochaine.</span>
        </span>
      </div>

      <h2 id="tax-ranges-title" class="text-xl mt-10 leading-10">Barème impôt {estimateNextYear ? 'avec revalorisation estimée' : 2026}</h2>
      <table aria-labelledby="tax-ranges-title">
        <thead>
          <tr>
            <th scope="col" class="pr-8 text-left font-semibold">Revenu par part</th>
            <th scope="col" class="text-left font-semibold">Taux</th>
          </tr>
        </thead>
        <tbody>
          {#each taxRanges as range, i}
            <tr>
              {#if Number.isFinite(range.threshold)}
                <td class="pr-8">Entre {formatFr(taxRanges[i - 1]?.threshold ?? 0)} € et { formatFr(range.threshold) } €</td>
              {:else}
                <td class="pr-8">Au delà de { formatFr(taxRanges[i - 1]?.threshold ?? 0) } €</td>
              {/if}
              <td>{formatFr(range.rate * 100)} %</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <footer class="mt-8 p-4 rounded-lg bg-neutral text-neutral-content">Ce simulateur ne prend pas en compte les cas complexes comme garde alternée, handicapé, veuve, etc. Le <a href="https://www.economie.gouv.fr/particuliers/quotient-familial" class="link" rel="noreferrer" target="_blank">plafonnement du quotient familial<span class="sr-only"> (nouvel onglet)</span></a> et la <a href="https://www.economie.gouv.fr/particuliers/decote-impot-revenu" class="link" rel="noreferrer" target="_blank">décote<span class="sr-only"> (nouvel onglet)</span></a> sont pris en compte. Un célibataire avec enfants est considéré comme parent isolé (case T).</footer>
    </div>
  </div>
</main>

<style>
  :root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
</style>

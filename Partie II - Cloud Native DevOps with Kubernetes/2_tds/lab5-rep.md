

Sélecteurs (Selectors)

kubectl get pods --all-namespaces 

kubectl get pods --show-labels

NAME                    ... LABELS
demo-5cb7d6bfdd-9dckm   ... app=demo,environment=development

Sélecteurs plus avancés

kubectl get pods -l app=demo,environment=production




kubectl get pods -l app!=demo



kubectl get pods -l environment in (staging, production)
L'équivalent YAML serait :

selector:
  matchExpressions:
  - {key: environment, operator: In, values: [staging, production]}


kubectl get pods -l environment notin (production)
L'équivalent YAML de ceci serait :

selector:
  matchExpressions:
  - {key: environment, operator: NotIn, values: [production]}


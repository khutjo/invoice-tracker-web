import { defineBoot } from '#q-app/wrappers'
import { QBtn, QInput, QSelect, QCard, QTable, QChip, QDialog, QMenu } from 'quasar'

type DefaultPropMap = Record<string, { default?: unknown }>

function setComponentDefaults(component: unknown, defaults: Record<string, unknown>) {
  const props = (component as { props?: DefaultPropMap }).props
  if (!props) return

  for (const [key, value] of Object.entries(defaults)) {
    const propDef = props[key]
    if (propDef && typeof propDef === 'object') {
      propDef.default = value
    }
  }
}

export default defineBoot(() => {
  setComponentDefaults(QBtn, {
    unelevated: true,
    noCaps: true,
    ripple: false,
  })

  setComponentDefaults(QInput, {
    outlined: true,
    dense: true,
    hideBottomSpace: true,
  })

  setComponentDefaults(QSelect, {
    outlined: true,
    dense: true,
    hideBottomSpace: true,
    emitValue: true,
    mapOptions: true,
  })

  setComponentDefaults(QCard, {
    flat: true,
    bordered: true,
  })

  setComponentDefaults(QTable, {
    flat: true,
    bordered: true,
    dense: true,
  })

  setComponentDefaults(QChip, {
    dense: true,
    ripple: false,
  })

  setComponentDefaults(QDialog, {
    transitionShow: 'fade',
    transitionHide: 'fade',
  })

  setComponentDefaults(QMenu, {
    transitionShow: 'fade',
    transitionHide: 'fade',
    offset: [0, 4],
  })
})

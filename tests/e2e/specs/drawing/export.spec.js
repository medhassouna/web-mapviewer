import { recurse } from 'cypress-recurse'

const downloadsFolder = Cypress.config('downloadsFolder')

const quickExportButton = '[data-cy="drawing-toolbox-quick-export-button"]'
const chooseExportFormatButton = '[data-cy="drawing-toolbox-choose-export-format-button"]'
const exportKmlButton = '[data-cy="drawing-toolbox-export-kml-button"]'
const exportGpxButton = '[data-cy="drawing-toolbox-export-gpx-button"]'

const isNonEmptyString = (x) => {
    return Boolean(x && x.length)
}

const checkFiles = (extension, callback) => {
    recurse(
        () => cy.task('findFiles', { folderName: downloadsFolder, extension: extension }),
        isNonEmptyString,
        {
            delay: 100,
            timeout: 10000,
        }
    ).then((files) => {
        const fileName = `${downloadsFolder}/${files[files.length - 1]}`
        expect(fileName).to.contains(`map.geo.admin.ch_${extension.toUpperCase()}_`)
        cy.readFile(fileName, { timeout: 15000 }).should('have.length.gt', 50).then(callback)
    })
}

const checkKmlFile = (content) => {
    ;['measure', 'marker', 'text', 'line'].forEach((type) => {
        expect(content).to.contains(`<value>${type}</value>`)
    })
    expect(content).to.contains('<value>new text</value>')
    expect(content).to.contains('/icons/001-marker@1x-255,0,0.png')
}
const checkGpxFile = (content) => {
    ;['MEASURE', 'MARKER', 'TEXT', 'LINE'].forEach((type) => {
        expect(content).to.contains(`<type>${type}</type>`)
    })
}

describe('Drawing toolbox actions', () => {
    beforeEach(() => {
        cy.task('deleteFolder', downloadsFolder)
    })

    context('Export KML', () => {
        it('exports KML when clicking on the export button (without choosing format)', () => {
            cy.goToDrawing()
            cy.drawGeoms()
            cy.get(quickExportButton).click()
            checkFiles('kml', checkKmlFile)
        })
        it('exports KML file through the "choose format" export menu', () => {
            cy.goToDrawing()
            cy.drawGeoms()
            cy.get(chooseExportFormatButton).click()
            cy.get(exportKmlButton).click()
            checkFiles('kml', checkKmlFile)
        })
    })

    context('Export GPX', () => {
        it('exports GPX file through the "choose format" export menu', () => {
            cy.goToDrawing()
            cy.drawGeoms()
            cy.get(chooseExportFormatButton).click()
            cy.get(exportGpxButton).click()

            checkFiles('gpx', checkGpxFile)
        })
    })
})